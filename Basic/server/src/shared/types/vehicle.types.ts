/**
 * 车辆相关类型定义
 * 状态枚举、车型分类
 */

/** 车辆状态枚举 */
export enum VehicleStatus {
  /** 空闲可用 */
  AVAILABLE = 1,
  /** 使用中 */
  IN_USE = 2,
  /** 维护中 */
  MAINTENANCE = 3,
  /** 已下线 */
  OFFLINE = 4,
  /** 故障 */
  FAULTY = 5,
}

/** 车辆状态显示名称 */
export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  [VehicleStatus.AVAILABLE]: '空闲',
  [VehicleStatus.IN_USE]: '使用中',
  [VehicleStatus.MAINTENANCE]: '维护中',
  [VehicleStatus.OFFLINE]: '已下线',
  [VehicleStatus.FAULTY]: '故障',
};

/** 车型分类 */
export enum VehicleType {
  /** 电动车 */
  ELECTRIC = 'electric',
  /** 摩托车 */
  MOTORCYCLE = 'motorcycle',
  /** 自行车 */
  BICYCLE = 'bicycle',
}

/** 车辆品牌（可扩展） */
export const VEHICLE_BRANDS = [
  '小牛',
  '九号',
  '雅迪',
  '爱玛',
  '台铃',
] as const;

/** 维护类型枚举 */
export enum MaintenanceType {
  /** 定期保养 */
  SCHEDULED = 1,
  /** 故障维修 */
  REPAIR = 2,
  /** 年检 */
  INSPECTION = 3,
  /** 保险续保 */
  INSURANCE = 4,
}
