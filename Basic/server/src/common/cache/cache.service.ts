/**
 * 缓存服务 - 热点数据缓存管理
 * 
 * 功能：
 * - 车辆列表缓存
 * - 用户信息缓存
 * - 价格计算结果缓存
 * - 门店信息缓存
 * - 缓存预热和失效机制
 */
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/** 缓存配置 */
interface CacheConfig {
  /** 缓存键前缀 */
  prefix: string;
  /** 默认过期时间（秒） */
  ttl: number;
}

/** 预定义缓存配置 */
const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // 车辆相关 - 5分钟
  VEHICLE_LIST: { prefix: 'vehicle:list', ttl: 300 },
  VEHICLE_DETAIL: { prefix: 'vehicle:detail', ttl: 300 },
  VEHICLE_MODEL: { prefix: 'vehicle:model', ttl: 600 },
  
  // 门店相关 - 10分钟
  STORE_LIST: { prefix: 'store:list', ttl: 600 },
  STORE_DETAIL: { prefix: 'store:detail', ttl: 600 },
  STORE_NEARBY: { prefix: 'store:nearby', ttl: 300 },
  
  // 用户相关 - 15分钟
  USER_INFO: { prefix: 'user:info', ttl: 900 },
  USER_MEMBER: { prefix: 'user:member', ttl: 900 },
  USER_WALLET: { prefix: 'user:wallet', ttl: 300 },
  USER_FAVORITES: { prefix: 'user:favorites', ttl: 600 },
  
  // 价格相关 - 5分钟（价格变动频繁）
  PRICE_CALC: { prefix: 'price:calc', ttl: 300 },
  PRICING_RULE: { prefix: 'price:rule', ttl: 600 },
  
  // 优惠券相关 - 10分钟
  COUPON_AVAILABLE: { prefix: 'coupon:available', ttl: 600 },
  COUPON_USER: { prefix: 'coupon:user', ttl: 300 },
  
  // 统计相关 - 1小时
  STATS_DASHBOARD: { prefix: 'stats:dashboard', ttl: 3600 },
  STATS_REVENUE: { prefix: 'stats:revenue', ttl: 3600 },
};

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redisService: RedisService) {}

  // ==================== 通用缓存方法 ====================

  /**
   * 生成缓存键
   */
  private buildKey(config: CacheConfig, ...parts: (string | number)[]): string {
    return `${config.prefix}:${parts.join(':')}`;
  }

  /**
   * 获取缓存
   */
  async get<T>(configKey: string, ...keyParts: (string | number)[]): Promise<T | null> {
    const config = CACHE_CONFIGS[configKey];
    if (!config) {
      this.logger.warn(`未知的缓存配置: ${configKey}`);
      return null;
    }

    const key = this.buildKey(config, ...keyParts);
    const cached = await this.redisService.get(key);

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached) as T;
    } catch (e) {
      this.logger.error(`缓存解析失败: ${key}`, e);
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set<T>(
    configKey: string,
    data: T,
    ...keyParts: (string | number)[]
  ): Promise<void> {
    const config = CACHE_CONFIGS[configKey];
    if (!config) {
      this.logger.warn(`未知的缓存配置: ${configKey}`);
      return;
    }

    const key = this.buildKey(config, ...keyParts);
    await this.redisService.set(key, JSON.stringify(data), config.ttl);
  }

  /**
   * 删除缓存
   */
  async del(configKey: string, ...keyParts: (string | number)[]): Promise<void> {
    const config = CACHE_CONFIGS[configKey];
    if (!config) {
      return;
    }

    const key = this.buildKey(config, ...keyParts);
    await this.redisService.del(key);
  }

  /**
   * 批量删除（模糊匹配）
   */
  async delPattern(pattern: string): Promise<number> {
    const keys = await this.redisService.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }

    for (const key of keys) {
      await this.redisService.del(key);
    }

    this.logger.log(`批量删除缓存: ${keys.length} 条`);
    return keys.length;
  }

  // ==================== 业务缓存方法 ====================

  /**
   * 获取用户信息缓存
   */
  async getUserInfo(userId: number): Promise<any | null> {
    return this.get<any>('USER_INFO', userId);
  }

  /**
   * 设置用户信息缓存
   */
  async setUserInfo(userId: number, data: any): Promise<void> {
    await this.set('USER_INFO', data, userId);
  }

  /**
   * 清除用户相关缓存
   */
  async clearUserCache(userId: number): Promise<void> {
    await this.del('USER_INFO', userId);
    await this.del('USER_MEMBER', userId);
    await this.del('USER_WALLET', userId);
    await this.del('USER_FAVORITES', userId);
    await this.delPattern(`coupon:user:${userId}:*`);
    this.logger.log(`清除用户 ${userId} 缓存完成`);
  }

  /**
   * 获取车辆列表缓存
   */
  async getVehicleList(storeId: number, status: number): Promise<any[] | null> {
    return this.get<any[]>('VEHICLE_LIST', storeId, status);
  }

  /**
   * 设置车辆列表缓存
   */
  async setVehicleList(storeId: number, status: number, data: any[]): Promise<void> {
    await this.set('VEHICLE_LIST', data, storeId, status);
  }

  /**
   * 获取车辆详情缓存
   */
  async getVehicleDetail(vehicleId: number): Promise<any | null> {
    return this.get<any>('VEHICLE_DETAIL', vehicleId);
  }

  /**
   * 设置车辆详情缓存
   */
  async setVehicleDetail(vehicleId: number, data: any): Promise<void> {
    await this.set('VEHICLE_DETAIL', data, vehicleId);
  }

  /**
   * 清除车辆相关缓存
   */
  async clearVehicleCache(vehicleId: number, storeId?: number): Promise<void> {
    await this.del('VEHICLE_DETAIL', vehicleId);
    
    // 清除门店的车辆列表缓存
    if (storeId) {
      await this.delPattern(`vehicle:list:${storeId}:*`);
    }
    
    this.logger.log(`清除车辆 ${vehicleId} 缓存完成`);
  }

  /**
   * 获取门店列表缓存
   */
  async getStoreList(lat?: number, lng?: number): Promise<any[] | null> {
    const key = lat && lng ? `${lat.toFixed(2)}:${lng.toFixed(2)}` : 'all';
    return this.get<any[]>('STORE_LIST', key);
  }

  /**
   * 设置门店列表缓存
   */
  async setStoreList(data: any[], lat?: number, lng?: number): Promise<void> {
    const key = lat && lng ? `${lat.toFixed(2)}:${lng.toFixed(2)}` : 'all';
    await this.set('STORE_LIST', data, key);
  }

  /**
   * 获取价格计算缓存
   */
  async getPriceCalc(
    modelId: number,
    pickupTime: string,
    returnTime: string,
    memberLevel: number,
  ): Promise<any | null> {
    const key = `${modelId}:${pickupTime.substring(0, 10)}:${returnTime.substring(0, 10)}:${memberLevel}`;
    return this.get<any>('PRICE_CALC', key);
  }

  /**
   * 设置价格计算缓存
   */
  async setPriceCalc(
    modelId: number,
    pickupTime: string,
    returnTime: string,
    memberLevel: number,
    data: any,
  ): Promise<void> {
    const key = `${modelId}:${pickupTime.substring(0, 10)}:${returnTime.substring(0, 10)}:${memberLevel}`;
    await this.set('PRICE_CALC', data, key);
  }

  /**
   * 获取可用优惠券缓存
   */
  async getAvailableCoupons(userId: number, amountCents: number): Promise<any[] | null> {
    return this.get<any[]>('COUPON_AVAILABLE', userId, amountCents);
  }

  /**
   * 设置可用优惠券缓存
   */
  async setAvailableCoupons(userId: number, amountCents: number, data: any[]): Promise<void> {
    await this.set('COUPON_AVAILABLE', data, userId, amountCents);
  }

  /**
   * 获取Dashboard统计缓存
   */
  async getDashboardStats(storeId?: number): Promise<any | null> {
    const key = storeId ? `store:${storeId}` : 'global';
    return this.get<any>('STATS_DASHBOARD', key);
  }

  /**
   * 设置Dashboard统计缓存
   */
  async setDashboardStats(data: any, storeId?: number): Promise<void> {
    const key = storeId ? `store:${storeId}` : 'global';
    await this.set('STATS_DASHBOARD', data, key);
  }

  // ==================== 缓存预热 ====================

  /**
   * 预热缓存（应用启动时调用）
   * 加载热点数据到缓存
   */
  async warmup(): Promise<void> {
    this.logger.log('开始缓存预热...');
    const startTime = Date.now();

    try {
      // 预热门店列表
      // await this.warmupStores();

      // 预热车辆模型列表
      // await this.warmupVehicleModels();

      // 预热定价规则
      // await this.warmupPricingRules();

      const elapsed = Date.now() - startTime;
      this.logger.log(`缓存预热完成，耗时 ${elapsed}ms`);
    } catch (e) {
      this.logger.error('缓存预热失败', e);
    }
  }

  /**
   * 清除所有缓存
   */
  async clearAll(): Promise<void> {
    this.logger.warn('清除所有缓存...');
    
    const prefixes = Object.values(CACHE_CONFIGS).map(c => c.prefix);
    
    for (const prefix of prefixes) {
      await this.delPattern(`${prefix}:*`);
    }
    
    this.logger.log('所有缓存已清除');
  }

  // ==================== 缓存统计 ====================

  /**
   * 获取缓存命中率统计
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
  }> {
    const allKeys = await this.redisService.keys('*');
    
    return {
      totalKeys: allKeys.length,
      memoryUsage: 'N/A', // 需要Redis INFO命令
    };
  }
}