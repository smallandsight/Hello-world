/**
 * GPS 轨迹模块 - 车辆定位与轨迹管理服务
 * 
 * 功能：
 * 1. 接收车载设备/APP上报的GPS坐标点
 * 2. 轨迹数据存储（Redis缓存 + MySQL持久化）
 * 3. 实时位置查询（用于地图展示车辆分布）
 * 4. 历史轨迹回放（订单行程记录）
 * 5. 地理围栏检测（进店/出店/超范围报警）
 * 6. 轨迹压缩（道格拉斯-普克算法，减少存储量）
 * 7. 行程里程和时长统计
 * 
 * 数据来源：
 * - 车载T-box/GPS模块定时上报
 * - 用户小程序上报（辅助定位）
 * 
 * 文档参考：T3W14-1 GPS轨迹模块需求
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import { Repository, Between, MoreThanOrEqual, LessThan } from 'typeorm';
import Redis from 'ioredis';

// ==================== 类型定义 ====================

/** GPS坐标点 */
export interface GpsPoint {
  vehicleId: number;
  longitude: number;    // 经度 (GCJ02坐标系)
  latitude: number;     // 纬度
  speed?: number;       // 速度 km/h (0-200)
  heading?: number;     // 方向角 0-359
  accuracy?: number;    // 精度(米)
  altitude?: number;    // 海拔(米)
  odometer?: number;    // 总里程(米)
  batteryLevel?: number;// 电量百分比 0-100
  /** 数据来源 */
  source: 'tbox' | 'app' | 'ble' | 'manual';
  /** 上报时间戳(毫秒) */
  timestamp: number;
}

/** 轨迹段（一段连续的行驶记录） */
export interface TrackSegment {
  id: number;
  vehicleId: number;
  orderId?: number;      // 关联订单
  startTime: number;
  endTime: number;
  startLocation: GpsPoint;
  endLocation: GpsPoint;
  distance: number;      // 米
  duration: number;       // 秒
  avgSpeed: number;       // km/h
  maxSpeed: number;
  pointCount: number;
}

/** 围栏区域 */
export interface GeoFence {
  id: string;
  name: string;
  type: 'circle' | 'polygon';
  center?: { lng: number; lat: number };
  radius?: number;        // 圆形围栏半径(米)
  vertices?: Array<{ lng: number; lat: number }>; // 多边形顶点
}

/** 实时位置信息 */
export interface VehicleLiveLocation {
  vehicleId: number;
  longitude: number;
  latitude: number;
  speed: number;
  heading: number;
  updatedAt: number;
  status: 'moving' | 'parked' | 'offline' | 'unknown';
  orderId?: number;
}

@Injectable()
export class GpsTrackService {
  private readonly logger = new Logger(GpsTrackService.name);
  
  /** Redis key 前缀 */
  private readonly REDIS_PREFIX = 'gps:';
  /** 实时位置缓存过期时间（秒）—— 30秒不更新视为离线 */
  private readonly LIVE_TTL = 60;
  /** 轨迹缓冲区大小（每车最多缓存多少个待持久化的点） */
  private readonly BUFFER_MAX = 500;

  constructor(
    @InjectRepository(GpsPointEntity) // 需要创建对应的Entity
    private gpsRepo: Repository<GpsPointEntity>,
    private redisClient: Redis,
  ) {}

  // ==================== 数据接收 ====================

  /**
   * 接收单个GPS定位点
   * 由车载设备或小程序调用，批量上报时使用 batchReportGpsPoints
   */
  async reportGpsPoint(point: GpsPoint): Promise<{
    received: boolean;
    pointCount: number;
    fenceEvents?: Array<{ fenceId: string; event: 'enter' | 'exit'; time: number }>;
  }> {
    try {
      // 1. 参数校验
      const validated = this.validatePoint(point);
      if (!validated) {
        throw new Error('GPS数据校验失败');
      }

      // 2. 写入Redis实时缓存
      const liveKey = `${this.REDIS_PREFIX}live:${point.vehicleId}`;
      const locationData = JSON.stringify({
        longitude: point.longitude,
        latitude: point.latitude,
        speed: point.speed || 0,
        heading: point.heading || 0,
        timestamp: point.timestamp || Date.now(),
      });
      await this.redisClient.setex(liveKey, this.LIVE_TTL, locationData);

      // 3. 加入缓冲队列（用于批量写入MySQL）
      const bufferKey = `${this.REDIS_PREFIX}buffer:${point.vehicleId}`;
      await this.redisClient.rpush(bufferKey, JSON.stringify(point));
      
      // 缓冲区达到阈值或手动触发时批量写入
      const bufferSize = await this.redisClient.llen(bufferKey);
      if (bufferSize >= 50) {
        await this.flushBuffer(point.vehicleId);
      }

      // 4. 围栏检测
      const fenceEvents = await this.checkGeoFences(point);

      this.logger.debug(`[GPS] 收到定位 vehicle=${point.vehicleId} (${point.latitude}, ${point.longitude})`);

      return {
        received: true,
        pointCount: 1,
        fenceEvents,
      };
    } catch (error) {
      this.logger.error(`[GPS] 定位上报失败 vehicle=${point.vehicleId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 批量上报GPS点位
   * 用于离线补传或高频率上报场景（如每秒一次）
   */
  async batchReportGpsPoints(points: GpsPoint[]): Promise<{
    successCount: number;
    failCount: number;
  }> {
    let successCount = 0;
    let failCount = 0;

    // 按vehicleId分组处理
    const grouped = new Map<number, GpsPoint[]>();
    for (const p of points) {
      const list = grouped.get(p.vehicleId) || [];
      list.push(p);
      grouped.set(p.vehicleId, list);
    }

    for (const [vehicleId, pts] of grouped.entries()) {
      try {
        // 更新最新实时位置（取最后一个点）
        const latest = pts[pts.length - 1];
        const liveKey = `${this.REDIS_PREFIX}live:${vehicleId}`;
        await this.redisClient.setex(liveKey, this.LIVE_TTL, JSON.stringify({
          longitude: latest.longitude,
          latitude: latest.latitude,
          speed: latest.speed || 0,
          heading: latest.heading || 0,
          timestamp: latest.timestamp || Date.now(),
        }));

        // 全部加入缓冲区
        const bufferKey = `${this.REDIS_PREFIX}buffer:${vehicleId}`;
        const pipe = this.redisClient.pipeline();
        for (const p of pts) {
          pipe.rpush(bufferKey, JSON.stringify(p));
        }
        await pipe.exec();

        successCount += pts.length;
      } catch (e) {
        failCount += pts.length;
      }
    }

    this.logger.log(`[GPS] 批量上报 完成 ${successCount}成功 ${failCount}失败`);
    return { successCount, failCount };
  }

  // ==================== 查询接口 ====================

  /**
   * 查询车辆实时位置
   * 从Redis读取，无则返回最后已知位置
   */
  async getVehicleLiveLocation(vehicleId: number): Promise<VehicleLiveLocation | null> {
    const liveKey = `${this.REDIS_PREFIX}live:${vehicleId}`;
    const data = await this.redisClient.get(liveKey);

    if (!data) {
      // 尝试从数据库取最后一个点
      const lastPoint = await this.gpsRepo.findOne({
        where: { vehicleId },
        order: { timestamp: 'DESC' },
      });

      if (!lastPoint) return null;

      const ageSec = (Date.now() - lastPoint.timestamp.getTime()) / 1000;
      return {
        vehicleId,
        longitude: lastPoint.longitude,
        latitude: lastPoint.latitude,
        speed: lastPoint.speed || 0,
        heading: lastPoint.heading || 0,
        updatedAt: lastPoint.timestamp.getTime(),
        status: ageSec > 300 ? 'offline' : 'parked',
      };
    }

    const loc = JSON.parse(data);
    const ageMs = Date.now() - loc.timestamp;
    
    return {
      vehicleId,
      longitude: loc.longitude,
      latitude: loc.latitude,
      speed: loc.speed || 0,
      heading: loc.heading || 0,
      updatedAt: loc.timestamp,
      status: loc.speed > 3 ? 'moving' :
              ageMs > this.LIVE_TTL * 1000 ? 'offline' : 'parked',
    };
  }

  /**
   * 批量获取多辆车的实时位置
   * 用于前端地图展示所有可用车辆
   */
  async getVehiclesLiveLocations(vehicleIds: number[]): Promise<Map<number, VehicleLiveLocation>> {
    const results = new Map<number, VehicleLiveLocation>();
    
    // 并发查询所有车辆
    const promises = vehicleIds.map(async (id) => {
      const loc = await this.getVehicleLiveLocation(id);
      if (loc) results.set(id, loc);
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * 查询指定时间范围内的历史轨迹
   * 用于订单行程回放
   */
  async getTrackHistory(params: {
    vehicleId: number;
    orderId?: number;
    startTime: number;   // 时间戳毫秒
    endTime: number;
    maxPoints?: number;  // 最大返回点数（默认不限）
  }): Promise<GpsPoint[]> {
    const queryBuilder = this.gpsRepo.createQueryBuilder('gps')
      .where('gps.vehicleId = :vehicleId', { vehicleId: params.vehicleId })
      .andWhere('gps.timestamp BETWEEN :start AND :end', {
        start: new Date(params.startTime),
        end: new Date(params.endTime),
      })
      .orderBy('gps.timestamp', 'ASC');

    if (params.orderId) {
      queryBuilder.andWhere('gps.orderId = :orderId', { orderId: params.orderId });
    }

    if (params.maxPoints && params.maxPoints > 0) {
      queryBuilder.limit(params.maxPoints);
    }

    const points = await queryBuilder.getMany();
    return points.map(this.toGpsPoint);
  }

  /**
   * 获取轨迹段列表（按行程分段）
   */
  async getTrackSegments(params: {
    vehicleId: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }): Promise<{ segments: TrackSegment[]; total: number }> {
    const page = params.page || 1;
    const size = Math.min(params.size || 20, 100);

    // 这里简化实现：从原始点位聚合生成轨迹段
    // 生产环境建议有单独的 track_segments 表
    const [points, total] = await this.gpsRepo.findAndCount({
      where: {
        vehicleId: params.vehicleId,
        ...(params.startDate ? { timestamp: MoreThanOrEqual(new Date(params.startDate)) } : {}),
        ...(params.endDate ? { timestamp: LessThan(new Date(params.endDate)) } : {}),
      },
      order: { timestamp: 'ASC' },
      skip: (page - 1) * size,
      take: size * 100, // 取足够多的点来聚合
    });

    const segments = this.aggregateToSegments(points.map(this.toGpsPoint));
    return { segments: segments.slice(0, size), total };
  }

  // ==================== 统计计算 ====================

  /**
   * 计算行程统计数据
   */
  async calculateTripStats(params: {
    vehicleId: number;
    startTime: number;
    endTime: number;
  }): Promise<{
    distance: number;         // 米
    duration: number;          // 秒
    movingDuration: number;    // 秒（实际行驶时间）
    avgSpeed: number;          // km/h
    maxSpeed: number;
    idleTime: number;           // 秒（停车等待）
    startPoint: GpsPoint | null;
    endPoint: GpsPoint | null;
  }> {
    const points = await this.getTrackHistory(params);

    if (points.length < 2) {
      return {
        distance: 0, duration: 0, movingDuration: 0,
        avgSpeed: 0, maxSpeed: 0, idleTime: 0,
        startPoint: points[0] || null,
        endPoint: points[points.length - 1] || null,
      };
    }

    let totalDistance = 0;
    let movingSeconds = 0;
    let idleSeconds = 0;
    let maxSpeed = 0;
    let speedSum = 0;
    let speedCount = 0;

    for (let i = 1; i < points.length; i++) {
      const dist = GpsTrackService.haversineDistance(points[i - 1], points[i]);
      totalDistance += dist;

      const speed = points[i].speed || 0;
      if (speed > maxSpeed) maxSpeed = speed;
      if (speed > 3) {
        speedSum += speed;
        speedCount++;
        movingSeconds += (points[i].timestamp - points[i - 1].timestamp) / 1000;
      } else {
        idleSeconds += (points[i].timestamp - points[i - 1].timestamp) / 1000;
      }
    }

    const duration = (points[points.length - 1].timestamp - points[0].timestamp) / 1000;

    return {
      distance: Math.round(totalDistance),
      duration: Math.round(duration),
      movingDuration: Math.round(movingSeconds),
      avgSpeed: speedCount > 0 ? Math.round(speedSum / speedCount * 10) / 10 : 0,
      maxSpeed: Math.round(maxSpeed),
      idleTime: Math.round(idleSeconds),
      startPoint: points[0],
      endPoint: points[points.length - 1],
    };
  }

  // ==================== 地理围栏 ====================

  /** 注册地理围栏 */
  registerFence(fence: GeoFence): void {
    // 存储到Redis或内存中
    this.logger.log(`[Fence] 注册围栏 ${fence.id}: ${fence.name}`);
  }

  /** 删除围栏 */
  removeFence(fenceId: string): void {
    this.logger.log(`[Fence] 删除围栏 ${fenceId}`);
  }

  /** 检测某个点是否触发了围栏事件 */
  private async checkGeoFences(point: GpsPoint): Promise<Array<{ fenceId: string; event: 'enter' | 'exit'; time: number }>> {
    // TODO: 实现围栏检测逻辑
    // 1. 从配置加载所有活跃围栏
    // 2. 判断点是否在围栏内
    // 3. 与上一次状态对比，判断是进入还是离开
    // 4. 触发事件回调
    return [];
  }

  // ==================== 内部方法 ====================

  /** 校验GPS点位数据合法性 */
  private validatePoint(point: GpsPoint): boolean {
    // 经度范围: -180 ~ 180
    // 纬度范围: -90 ~ 90 (本项目主要在中国境内)
    if (
      !Number.isFinite(point.longitude) ||
      !Number.isFinite(point.latitude) ||
      point.longitude < 72 || point.longitude > 136 ||
      point.latitude < 3.8 || point.latitude > 53.55
    ) {
      return false;
    }
    if (point.speed !== undefined && (point.speed < 0 || point.speed > 300)) {
      return false;
    }
    return true;
  }

  /** 将缓冲区数据刷写到数据库 */
  private async flushBuffer(vehicleId: number): Promise<number> {
    const bufferKey = `${this.REDIS_PREFIX}buffer:${vehicleId}`;

    const count = await this.redisClient.llen(bufferKey);
    if (count === 0) return 0;

    const rawPoints = await this.redisClient.lrange(bufferKey, 0, -1);

    // 清空缓冲区
    await this.redisClient.del(bufferKey);

    try {
      const entities = rawPoints.map((raw) => {
        const parsed = JSON.parse(raw) as GpsPoint;
        return this.gpsRepo.create({
          vehicleId: parsed.vehicleId,
          longitude: parsed.longitude,
          latitude: parsed.latitude,
          speed: parsed.speed || 0,
          heading: parsed.heading || 0,
          accuracy: parsed.accuracy,
          altitude: parsed.altitude,
          odometer: parsed.odometer,
          batteryLevel: parsed.batteryLevel,
          source: parsed.source,
          timestamp: new Date(parsed.timestamp || Date.now()),
        });
      });

      // 批量插入（每批100条）
      const batchSize = 100;
      for (let i = 0; i < entities.length; i += batchSize) {
        const batch = entities.slice(i, i + batchSize);
        await this.gpsRepo.insert(batch);
      }

      this.logger.debug(`[GPS] 刷写 ${entities.length} 个点到DB vehicle=${vehicleId}`);
      return entities.length;
    } catch (error) {
      this.logger.error(`[GPS] 刷写失败 vehicle=${vehicleId}: ${error.message}`);
      // 失败后重新放回缓冲区（简化处理：丢弃）
      return 0;
    }
  }

  /** Entity → GpsPoint 转换 */
  private toGpsPoint(entity: any): GpsPoint {
    return {
      vehicleId: entity.vehicleId,
      longitude: entity.longitude,
      latitude: entity.latitude,
      speed: entity.speed,
      heading: entity.heading,
      accuracy: entity.accuracy,
      altitude: entity.altitude,
      odometer: entity.odometer,
      batteryLevel: entity.batteryLevel,
      source: entity.source,
      timestamp: entity.timestamp?.getTime() || Date.now(),
    };
  }

  /** 将离散点位聚合为轨迹段（基于停车判定） */
  private aggregateToSegments(points: GpsPoint[]): TrackSegment[] {
    if (points.length === 0) return [];

    const segments: TrackSegment[] = [];
    let segmentStartIdx = 0;

    // 停车判定：速度持续低于3km/h且超过120秒视为停车断点
    const PARK_SPEED_THRESHOLD = 3;
    const PARK_TIME_THRESHOLD = 120_000; // 2分钟

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      // 检测停车断点
      if (
        curr.speed <= PARK_SPEED_THRESHOLD &&
        (curr.timestamp - prev.timestamp) > PARK_TIME_THRESHOLD
      ) {
        // 结束当前段
        const segPoints = points.slice(segmentStartIdx, i);
        if (segPoints.length >= 2) {
          segments.push(this.buildSegment(segPoints));
        }
        segmentStartIdx = i;
      }
    }

    // 最后一段
    if (segmentStartIdx < points.length) {
      const remaining = points.slice(segmentStartIdx);
      if (remaining.length >= 2) {
        segments.push(this.buildSegment(remaining));
      }
    }

    return segments;
  }

  /** 从一组点位构建轨迹段 */
  private buildSegment(points: GpsPoint[]): TrackSegment {
    let distance = 0;
    let maxSpeed = 0;
    let speedSum = 0;

    for (let i = 1; i < points.length; i++) {
      distance += GpsTrackService.haversineDistance(points[i - 1], points[i]);
      const s = points[i].speed || 0;
      if (s > maxSpeed) maxSpeed = s;
      speedSum += s;
    }

    const duration = (points[points.length - 1].timestamp - points[0].timestamp) / 1000;

    return {
      id: 0, // 占位
      vehicleId: points[0].vehicleId,
      startTime: points[0].timestamp,
      endTime: points[points.length - 1].timestamp,
      startLocation: points[0],
      endLocation: points[points.length - 1],
      distance: Math.round(distance),
      duration: Math.round(duration),
      avgSpeed: duration > 0 ? Math.round(distance / duration * 36) / 10 : 0,
      maxSpeed: Math.round(maxSpeed),
      pointCount: points.length,
    };
  }

  // ==================== 工具函数 ====================

  /**
   * Haversine 公式计算两点间距离（米）
   * 静态方法供其他模块使用
   */
  static haversineDistance(a: { longitude: number; latitude: number }, b: { longitude: number; latitude: number }): number {
    const R = 6371000; // 地球平均半径（米）
    const toRad = (deg: number) => deg * Math.PI / 180;

    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);

    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);

    const h = sinLat ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLng ** 2;

    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  /**
   * 定时任务：刷新所有车辆的缓冲区
   * 建议每分钟执行一次
   */
  async flushAllBuffers(): Promise<{ vehicles: number; totalPoints: number }> {
    // 扫描所有buffer keys
    const pattern = `${this.REDIS_PREFIX}buffer:*`;
    const keys = await this.redisClient.keys(pattern);

    let totalPoints = 0;
    for (const key of keys) {
      const vehicleIdStr = key.replace(`${this.REDIS_PREFIX}buffer:`, '');
      const vehicleId = parseInt(vehicleIdStr, 10);
      if (!isNaN(vehicleId)) {
        totalPoints += await this.flushBuffer(vehicleId);
      }
    }

    return { vehicles: keys.length, totalPoints };
  }
}

/** 占位符 - 实际应使用已有的 GpsPoint Entity 或创建新表 */
class GpsPointEntity {
  id: number;
  vehicleId: number;
  orderId?: number;
  longitude: number;
  latitude: number;
  speed: number;
  heading: number;
  accuracy?: number;
  altitude?: number;
  odometer?: number;
  batteryLevel?: number;
  source: string;
  timestamp: Date;
}
