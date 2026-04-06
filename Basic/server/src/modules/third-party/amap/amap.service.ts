/**
 * 高德地图 API 服务
 * 
 * 功能：
 * 1. 地理编码（地址 → 经纬度 / 经纬度 → 地址）
 * 2. 路径规划（驾车/骑行/步行）
 * 3. 距离和耗时计算
 * 4. IP定位（获取用户大致位置）
 * 5. 关键词搜索（POI搜索）
 * 6. 天气查询（取车/还车时提示）
 * 
 * 文档：https://lbs.amap.com/api/webservice/summary
 * Key申请：https://console.amap.com/dev/key/app
 */
import { Injectable, Logger } from '@nestjs/common';

export interface AmapConfig {
  /** Web服务API Key */
  webApiKey: string;
}

/** 坐标点 */
export interface AmapPoint {
  longitude: number;   // 经度
  latitude: number;    // 纬度
  address?: string;
}

/** 路径规划结果 */
export interface AmapRouteResult {
  distance: number;        // 米
  duration: number;        // 秒
  steps: RouteStep[];
  tolls: number;           // 过路费（元）
  tollDistance: number;    // 收费路段距离（米）
}

/** 路径步骤 */
export interface RouteStep {
  instruction: string;     // 指引文字
  road: string;            // 道路名
  distance: number;        // 米
  duration: number;        // 秒
  polyline: string;        // 编码后的路径点（用于前端绘制）
  action: string;          // 动作：直行/左转/右转等
  entrance: PointInfo;
  exit: PointInfo;
}

interface PointInfo {
  longitude: number;
  latitude: number;
}

/** 地理编码结果 */
export interface GeocodeResult {
  formattedAddress: string;
  province: string;
  city: string;
  district: string;
  township?: string;
  adcode: string;
  location: AmapPoint;
}

/** POI搜索结果 */
export interface PoiItem {
  id: string;
  name: string;
  address: string;
  location: AmapPoint;
  type: string;
  distance?: number;
}

@Injectable()
export class AmapService {
  private readonly logger = new Logger(AmapService.name);
  private config: AmapConfig;

  /** 高德API基础URL */
  private readonly BASE_URL = 'https://restapi.amap.com/v3';

  constructor() {
    this.config = {
      webApiKey: process.env.AMAP_WEB_API_KEY || '',
    };

    if (this.config.webApiKey) {
      this.logger.log('[Amap] 初始化成功');
    } else {
      this.logger.warn('[Amap] 缺少AMAP_WEB_API_KEY，地图服务将不可用');
    }
  }

  get isEnabled(): boolean {
    return !!this.config.webApiKey;
  }

  // ==================== 地理编码 ====================

  /**
   * 地址解析（地址 → 经纬度）
   * 对应API：v3/geocode/geo
   * 
   * @param address - 详细地址，如 "杭州市西湖区文三路xxx"
   * @param city - 可选，指定城市
   */
  async geocode(address: string, city?: string): Promise<GeocodeResult | null> {
    try {
      const params: Record<string, string> = {
        key: this.config.webApiKey,
        address,
        output: 'JSON',
      };
      if (city) params.city = city;

      const result = await this.request('geocode/geo', params);
      return this.parseGeocode(result, address);
    } catch (error) {
      this.logger.error(`[Amap] 地址解析失败 "${address}": ${error.message}`);
      return null;
    }
  }

  /**
   * 逆地理编码（经纬度 → 地址）
   * 对应API：v3/geocode/regeo
   * 
   * @param lng - 经度
   * @param lat - 纬度
   */
  async reverseGeocode(lng: number, lat: number): Promise<GeocodeResult | null> {
    try {
      const result = await this.request('geocode/regeo', {
        key: this.config.webApiKey,
        location: `${lng},${lat}`,
        output: 'JSON',
        extensions: 'all', // 返回详细行政区划+道路信息
      });

      if (result.status !== '1' || !result.regeocode) {
        return null;
      }

      const regeocode = result.regeocode;
      const addressComponent = regeocode.addressComponent || {};

      return {
        formattedAddress: regeocode.formatted_address || `${lat},${lng}`,
        province: addressComponent.province || '',
        city: addressComponent.city || '',
        district: addressComponent.district || '',
        township: addressComponent.township,
        adcode: addressComponent.adcode || '',
        location: { longitude: lng, latitude: lat },
      };
    } catch (error) {
      this.logger.error(`[Amap] 逆地码失败 ${lng},${lat}: ${error.message}`);
      return null;
    }
  }

  // ==================== 路径规划 ====================

  /**
   * 驾车路径规划
   * 对应API：v3/direction/driving
   * 
   * @param origin - 起点
   * @param destination - 终点
   */
  async drivingRoute(
    origin: AmapPoint,
    destination: AmapPoint,
  ): Promise<AmapRouteResult | null> {
    try {
      const result = await this.request('direction/driving', {
        key: this.config.webApiKey,
        origin: `${origin.longitude},${origin.latitude}`,
        destination: `${destination.longitude},${destination.latitude}`,
        extensions: 'all',
        strategy: '0',     // 推荐策略
        output: 'JSON',
      });

      return this.parseRouteResult(result);
    } catch (error) {
      this.logger.error(`[Amap] 驾车路径规划失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 骑行路径规划（电动车骑行场景）
   * 对应API：v3/direction/bicycling
   */
  async cyclingRoute(
    origin: AmapPoint,
    destination: AmapPoint,
  ): Promise<AmapRouteResult | null> {
    try {
      const result = await this.request('direction/bicycling', {
        key: this.config.webApiKey,
        origin: `${origin.longitude},${origin.latitude}`,
        destination: `${destination.longitude},${destination.latitude}`,
        output: 'JSON',
      });

      return this.parseRouteResult(result);
    } catch (error) {
      this.logger.error(`[Amap] 骑行路径规划失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 步行路径规划
   */
  async walkingRoute(
    origin: AmapPoint,
    destination: AmapPoint,
  ): Promise<AmapRouteResult | null> {
    try {
      const result = await this.request('direction/walking', {
        key: this.config.webApiKey,
        origin: `${origin.longitude},${origin.latitude}`,
        destination: `${destination.longitude},${destination.latitude}`,
        output: 'JSON',
      });

      return this.parseRouteResult(result);
    } catch (error) {
      this.logger.error(`[Amap] 步行路径规划失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 计算两点间直线距离（米）
   * 使用 Haversine 公式，不调用API
   */
  static calculateStraightDistance(
    point1: AmapPoint,
    point2: AmapPoint,
  ): number {
    const R = 6371000; // 地球半径（米）
    const toRad = (deg: number) => deg * Math.PI / 180;

    const dLat = toRad(point2.latitude - point1.latitude);
    const dLng = toRad(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(point1.latitude)) *
      Math.cos(toRad(point2.latitude)) *
      Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 多目标距离矩阵计算
   * 对应API：v3/distance
   * 用于计算用户到多个门店的距离排序
   */
  async distanceMatrix(
    origins: Array<{ lng: number; lat: number }>,
    destinations: Array<{ lng: number; lat: number }>,
    type: 'driving' | 'walking' = 'driving',
  ): Promise<Array<{
    originId: number;
    destId: number;
    distance: number;   // 米
    duration: number;   // 秒
  }>> {
    try {
      const originsStr = origins.map(o => `${o.lng},${o.lat}`).join('|');
      const destsStr = destinations.map(d => `${d.lng},${d.lat}`).join('|');

      const result = await this.request('distance', {
        key: this.config.webApiKey,
        origins: originsStr,
        destination: destsStr,
        type: type === 'driving' ? '1' : '3', // 1=驾车 3=步行
        output: 'JSON',
      });

      if (result.status !== '1') {
        throw new Error(result.info || '距离计算失败');
      }

      return (result.results || []).flat().map((item: any, idx: number) => ({
        originId: item.origin_id ?? Math.floor(idx / destinations.length),
        destId: item.destination_id ?? idx % destinations.length,
        distance: item.distance || 0,
        duration: item.duration || 0,
      }));
    } catch (error) {
      this.logger.error(`[Amap] 距离矩阵计算失败: ${error.message}`);
      return [];
    }
  }

  // ==================== POI搜索 ====================

  /**
   * 关键词搜索POI
   * 对应API：v3/place/text
   * 
   * @param keywords - 搜索关键词
   * @param city - 城市
   * @param center - 中心点坐标（按距离排序时使用）
   */
  async searchPoi(
    keywords: string,
    city?: string,
    center?: AmapPoint,
    limit: number = 20,
  ): Promise<PoiItem[]> {
    try {
      const params: Record<string, string> = {
        key: this.config.webApiKey,
        keywords,
        offset: String(limit),
        output: 'JSON',
        extensions: 'all',
      };

      if (city) params.city = city;
      if (center) {
        params.location = `${center.longitude},${center.latitude}`;
        params.sortrule = 'distance'; // 按距离排序
      }

      const result = await this.request('place/text', params);

      if (result.status !== '1' || !result.pois) {
        return [];
      }

      return result.pois.map((poi: any) => ({
        id: poi.id,
        name: poi.name,
        address: poi.address || poi.pname + poi.cityname + poi.adname || '',
        location: {
          longitude: parseFloat(poi.location?.split(',')[0] || '0'),
          latitude: parseFloat(poi.location?.split(',')[1] || '0'),
        },
        type: poi.type || '',
        distance: poi.distance ? parseInt(poi.distance, 10) : undefined,
      }));
    } catch (error) {
      this.logger.error(`[Amap] POI搜索失败 "${keywords}": ${error.message}`);
      return [];
    }
  }

  /**
   * 周边搜索（以某坐标为中心的圆形范围搜索）
   * 对应API：v3/place/around
   */
  async searchNearby(
    center: AmapPoint,
    keywords: string,
    radius: number = 1000,
    limit: number = 20,
  ): Promise<PoiItem[]> {
    try {
      const result = await this.request('place/around', {
        key: this.config.webApiKey,
        keywords,
        location: `${center.longitude},${center.latitude}`,
        radius: String(radius),
        offset: String(limit),
        output: 'JSON',
        sortrule: 'distance',
      });

      if (result.status !== '1' || !result.pois) {
        return [];
      }

      return result.pois.map((poi: any) => ({
        id: poi.id,
        name: poi.name,
        address: poi.address || '',
        location: {
          longitude: parseFloat(poi.location?.split(',')[0] || '0'),
          latitude: parseFloat(poi.location?.split(',')[1] || '0'),
        },
        type: poi.type || '',
        distance: poi.distance ? parseInt(poi.distance, 10) : undefined,
      }));
    } catch (error) {
      this.logger.error(`[Amap] 周边搜索失败: ${error.message}`);
      return [];
    }
  }

  // ==================== 辅助功能 ====================

  /**
   * IP 定位
   * 对应API：v3/ip
   * 
   * @param ip - 用户IP（可选，不传则自动识别）
   */
  async locateByIp(ip?: string): Promise<{
    province: string;
    city: string;
    adcode: string;
    rectangle: string;
  } | null> {
    try {
      const params: Record<string, string> = {
        key: this.config.webApiKey,
        output: 'JSON',
      };
      if (ip) params.ip = ip;

      const result = await this.request('ip', params);

      if (result.status !== '1' || !result.city) {
        return null;
      }

      return {
        province: result.province || '',
        city: result.city || '',
        adcode: result.adcode || '',
        rectangle: result.rectangle || '',
      };
    } catch (error) {
      this.logger.error(`[Amap] IP定位失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 天气查询（用于取车/还车时的天气提醒）
   * 对应API：v3/weather/weatherInfo
   */
  async getWeather(city: string, extensions: 'base' | 'all' = 'base'): Promise<{
    province: string;
    city: string;
    weather: string;
    temperature: string;
    windDirection: string;
    windPower: string;
    humidity: string;
    reportTime: string;
  } | null> {
    try {
      const result = await this.request('weather/weatherInfo', {
        key: this.config.webApiKey,
        city,
        extensions,
        output: 'JSON',
      });

      if (result.status !== '1' || !result.lives?.[0]) {
        return null;
      }

      const live = result.lives[0];
      return {
        province: live.province,
        city: live.city,
        weather: live.weather,
        temperature: live.temperature,
        windDirection: live.winddirection,
        windPower: live.windpower,
        humidity: live.humidity,
        reportTime: live.reporttime,
      };
    } catch (error) {
      this.logger.error(`[Amap] 天气查询失败 ${city}: ${error.message}`);
      return null;
    }
  }

  // ==================== 内部方法 ====================

  /** 发起HTTP请求到高德API */
  private async request(path: string, params: Record<string, string>): Promise<any> {
    const url = `${this.BASE_URL}/${path}?${new URLSearchParams(params).toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /** 解析正向地理编码结果 */
  private parseGeocode(result: any, inputAddress: string): GeocodeResult | null {
    if (result.status !== '1' || !result.geocodes?.[0]) {
      return null;
    }

    const geo = result.geocodes[0];
    const location = geo.location?.split(',').map(Number);

    if (!location || location.length < 2) {
      return null;
    }

    return {
      formattedAddress: geo.formatted_address || inputAddress,
      province: geo.province || '',
      city: geo.city || '',
      district: geo.district || '',
      adcode: geo.adcode || '',
      location: {
        longitude: location[0],
        latitude: location[1],
      },
    };
  }

  /** 解析路径规划结果 */
  private parseRouteResult(result: any): AmapRouteResult | null {
    if (result.status !== '1' || !result.route?.paths?.[0]) {
      return null;
    }

    const path = result.route.paths[0];
    const steps: RouteStep[] = (path.steps || []).map((step: any) => ({
      instruction: step.instruction || '',
      road: step.road || '',
      distance: parseInt(step.distance || '0', 10),
      duration: parseInt(step.duration || '0', 10),
      polyline: step.polyline || '',
      action: step.action || '',
      entrance: {
        longitude: parseFloat(step.entrance_location?.split(',')[0] || '0'),
        latitude: parseFloat(step.entrance_location?.split(',')[1] || '0'),
      },
      exit: {
        longitude: parseFloat(step.exit_location?.split(',')[0] || '0'),
        latitude: parseFloat(step.exit_location?.split(',')[1] || '0'),
      },
    }));

    return {
      distance: parseInt(path.distance || '0', 10),
      duration: parseInt(path.duration || '0', 10),
      steps,
      tolls: parseFloat(path.tolls || '0'),
      tollDistance: parseInt(path.toll_distance || '0', 10),
    };
  }
}
