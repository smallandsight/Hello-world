import type { PaginatedResponse } from './common'

// ==================== 车辆相关 ====================

/** 车辆状态 */
export enum VehicleStatus {
  AVAILABLE = 1,    // 可用
  RENTED = 2,       // 出租中
  MAINTENANCE = 3,  // 维护中
  OFFLINE = 4,      // 已下架
  DELETED = 99,     // 已删除
}

/** 车型信息 */
export interface VehicleModel {
  id: number
  brand: string
  model: string
  modelName: string   // 品牌型号全称
  seatCount: number
  fuelType: string
  transmission: string
  dailyRate: number   // 日租金（分）
  image: string
  tags: string[]
}

/** 车辆详情 */
export interface Vehicle {
  id: number
  vin: string
  plateNumber: string
  brand: string
  model: string
  color: string
  vehicleType: number
  vehicleTypeText: string
  seatCount: number
  transmission: string
  transmissionText: string
  fuelType: string
  fuelTypeText: string
  dailyRate: number   // 日租金（分）
  deposit: number     // 押金（分）
  mileage: number
  image: string
  images: VehicleImage[]
  store: Store
  modelInfo: VehicleModel
  status: VehicleStatus
  statusText: string
  rating?: VehicleRating
}

/** 车辆图片 */
export interface VehicleImage {
  id: number
  url: string
  type: 'exterior' | 'interior' | 'license' | 'accident'
  sortOrder: number
}

/** 车辆评分 */
export interface VehicleRating {
  avgScore: number
  reviewCount: number
}

/** 车辆列表项（精简） */
export interface VehicleListItem {
  id: number
  brand: string
  model: string
  image: string
  dailyRate: number
  vehicleTypeText: string
  seatCount: number
  transmissionText: string
  storeName: string
  distance?: string     // 距离如 "1.2km"
  status: VehicleStatus
  rating?: VehicleRating
}

// ==================== 门店相关 ====================

/** 门店 */
export interface Store {
  id: number
  name: string
  address: string
  province: string
  city: string
  district: string
  latitude: number
  longitude: number
  phone: string
  openTime: string
  closeTime: string
  distance?: string
  vehicleCount?: number
  image?: string
}
