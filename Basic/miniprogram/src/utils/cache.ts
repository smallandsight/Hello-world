/**
 * 前端缓存工具
 * 
 * 功能：
 * - 接口响应缓存
 * - 缓存过期管理
 * - 缓存命中统计
 */

// ==================== 类型定义 ====================

interface CacheItem<T> {
  data: T
  expireAt: number
  createdAt: number
}

interface CacheOptions {
  /** 缓存时间（秒），默认 5 分钟 */
  ttl?: number
  /** 是否强制刷新 */
  forceRefresh?: boolean
}

// ==================== 缓存配置 ====================

/** 默认缓存时间（秒） */
const DEFAULT_TTL = 300

/** 各类型数据的缓存时间配置 */
const TTL_CONFIG: Record<string, number> = {
  // 车辆列表 - 5分钟
  'vehicle:list': 300,
  // 车辆详情 - 5分钟
  'vehicle:detail': 300,
  // 门店列表 - 10分钟
  'store:list': 600,
  // 用户信息 - 15分钟
  'user:info': 900,
  // 用户会员 - 15分钟
  'user:member': 900,
  // 优惠券列表 - 5分钟
  'coupon:list': 300,
  // 价格计算 - 2分钟（价格敏感）
  'price:calc': 120,
  // 配置数据 - 1小时
  'config:*': 3600,
}

// ==================== 存储封装 ====================

const PREFIX = 'gy_cache_'

function getStorage(): UniApp.Storage {
  return uni
}

function getFullKey(key: string): string {
  return PREFIX + key
}

// ==================== 核心方法 ====================

/**
 * 获取缓存
 */
export function getCache<T>(key: string): T | null {
  try {
    const fullKey = getFullKey(key)
    const raw = getStorage().getStorageSync(fullKey)
    
    if (!raw) {
      return null
    }

    const item: CacheItem<T> = JSON.parse(raw)
    
    // 检查是否过期
    if (Date.now() > item.expireAt) {
      // 异步删除过期缓存
      getStorage().removeStorageSync(fullKey)
      return null
    }

    return item.data
  } catch (e) {
    console.warn('[Cache] 读取缓存失败:', key, e)
    return null
  }
}

/**
 * 设置缓存
 */
export function setCache<T>(key: string, data: T, ttl?: number): void {
  try {
    const fullKey = getFullKey(key)
    const finalTtl = ttl ?? getTtl(key)
    
    const item: CacheItem<T> = {
      data,
      expireAt: Date.now() + finalTtl * 1000,
      createdAt: Date.now(),
    }

    getStorage().setStorageSync(fullKey, JSON.stringify(item))
  } catch (e) {
    console.warn('[Cache] 写入缓存失败:', key, e)
  }
}

/**
 * 删除缓存
 */
export function delCache(key: string): void {
  try {
    const fullKey = getFullKey(key)
    getStorage().removeStorageSync(fullKey)
  } catch (e) {
    console.warn('[Cache] 删除缓存失败:', key, e)
  }
}

/**
 * 清除所有缓存
 */
export function clearCache(): void {
  try {
    const res = getStorage().getStorageInfoSync()
    const keys = res.keys.filter(k => k.startsWith(PREFIX))
    
    keys.forEach(key => {
      getStorage().removeStorageSync(key)
    })
    
    console.log('[Cache] 清除缓存完成:', keys.length, '条')
  } catch (e) {
    console.warn('[Cache] 清除缓存失败:', e)
  }
}

/**
 * 清除指定前缀的缓存
 */
export function clearCacheByPrefix(prefix: string): void {
  try {
    const res = getStorage().getStorageInfoSync()
    const keys = res.keys.filter(k => k.startsWith(PREFIX + prefix))
    
    keys.forEach(key => {
      getStorage().removeStorageSync(key)
    })
    
    console.log('[Cache] 清除前缀缓存:', prefix, keys.length, '条')
  } catch (e) {
    console.warn('[Cache] 清除前缀缓存失败:', prefix, e)
  }
}

// ==================== 辅助方法 ====================

/**
 * 根据键名获取对应的缓存时间
 */
function getTtl(key: string): number {
  // 精确匹配
  if (TTL_CONFIG[key]) {
    return TTL_CONFIG[key]
  }
  
  // 通配符匹配
  for (const [pattern, ttl] of Object.entries(TTL_CONFIG)) {
    if (pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1))) {
      return ttl
    }
  }
  
  return DEFAULT_TTL
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): {
  totalKeys: number
  totalSize: string
  expiredKeys: number
} {
  try {
    const res = getStorage().getStorageInfoSync()
    const cacheKeys = res.keys.filter(k => k.startsWith(PREFIX))
    
    let expiredCount = 0
    
    cacheKeys.forEach(key => {
      try {
        const raw = getStorage().getStorageSync(key)
        if (raw) {
          const item = JSON.parse(raw)
          if (Date.now() > item.expireAt) {
            expiredCount++
          }
        }
      } catch (e) {
        // 忽略解析错误
      }
    })

    return {
      totalKeys: cacheKeys.length,
      totalSize: `${(res.currentSize / 1024).toFixed(2)}KB`,
      expiredKeys: expiredCount,
    }
  } catch (e) {
    return {
      totalKeys: 0,
      totalSize: '0KB',
      expiredKeys: 0,
    }
  }
}

// ==================== 高级封装 ====================

/**
 * 带缓存的请求封装
 * 
 * @param key 缓存键
 * @param fetcher 数据获取函数
 * @param options 缓存选项
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const { ttl, forceRefresh = false } = options

  // 如果不强制刷新，先尝试从缓存获取
  if (!forceRefresh) {
    const cached = getCache<T>(key)
    if (cached !== null) {
      console.log('[Cache] 命中缓存:', key)
      return cached
    }
  }

  // 缓存未命中或强制刷新，发起请求
  console.log('[Cache] 缓存未命中，发起请求:', key)
  const data = await fetcher()
  
  // 写入缓存
  setCache(key, data, ttl)
  
  return data
}

/**
 * 清除用户相关缓存
 */
export function clearUserCache(): void {
  clearCacheByPrefix('user:')
  clearCacheByPrefix('coupon:')
  console.log('[Cache] 用户缓存已清除')
}

/**
 * 清除车辆相关缓存
 */
export function clearVehicleCache(): void {
  clearCacheByPrefix('vehicle:')
  clearCacheByPrefix('store:')
  console.log('[Cache] 车辆缓存已清除')
}

// ==================== 导出 ====================

export default {
  get: getCache,
  set: setCache,
  del: delCache,
  clear: clearCache,
  clearByPrefix: clearCacheByPrefix,
  stats: getCacheStats,
  withCache,
  clearUserCache,
  clearVehicleCache,
}