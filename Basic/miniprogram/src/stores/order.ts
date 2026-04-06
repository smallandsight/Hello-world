import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { VehicleListItem, Store } from '@/types/vehicle'
import type { CreateOrderParams, FeeDetail, Order } from '@/types/order'

/**
 * 订单相关状态管理
 * - 管理下单流程中的临时选择数据
 * - 管理当前活跃的订单信息
 */
export const useOrderStore = defineStore('order', () => {
  // ==================== State ====================

  /** 当前选中的车辆 */
  const selectedVehicle = ref<VehicleListItem | null>(null)

  /** 当前选中的门店 */
  const selectedStore = ref<Store | null>(null)

  /** 取车门店（可不同于还车） */
  const pickupStore = ref<Store | null>(null)

  /** 还车门店 */
  const returnStore = ref<Store | null>(null)

  /** 租赁时间段 */
  const rentalTime = ref<{
    startTime: string
    endTime: string
  }>({
    startTime: '',
    endTime: '',
  })

  /** 选中的保险类型 */
  const insuranceType = ref<'basic' | 'premium' | 'none'>('basic')

  /** 选中的优惠券 ID */
  const selectedCouponId = ref<number | undefined>()

  /** 价格预览结果 */
  const feePreview = ref<FeeDetail | null>(null)

  /** 当前正在操作的订单 */
  const currentOrder = ref<Order | null>(null)

  // ==================== Getters ====================

  /** 租赁天数 */
  const rentDays = computed(() => {
    if (!rentalTime.value.startTime || !rentalTime.value.endTime) return 0
    const start = new Date(rentalTime.value.startTime).getTime()
    const end = new Date(rentalTime.value.endTime).getTime()
    const diffMs = end - start
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  })

  /** 是否可以提交订单 */
  const canSubmitOrder = computed(() => {
    return !!(
      selectedVehicle.value &&
      pickupStore.value &&
      returnStore.value &&
      rentalTime.value.startTime &&
      rentalTime.value.endTime &&
      rentDays.value > 0
    )
  })

  /** 订单总金额（分） */
  const totalAmount = computed(() => {
    return feePreview.value?.totalFee ?? 0
  })

  /** 格式化后的订单金额 */
  const totalAmountDisplay = computed(() => {
    const yuan = (totalAmount.value / 100).toFixed(2)
    return `¥${yuan}`
  })

  // ==================== Actions ====================

  /** 选择车辆 */
  function selectVehicle(vehicle: VehicleListItem) {
    selectedVehicle.value = vehicle
    // 默认使用车辆所属门店为取还车门点
    // 注意：VehicleListItem 可能没有完整 store 对象，需要额外查询
  }

  /** 选择取车门店 */
  function setPickupStore(store: Store) {
    pickupStore.value = store
    // 如果还未设置还车门点，默认同取车门点
    if (!returnStore.value) {
      returnStore.value = store
    }
  }

  /** 选择还车门点 */
  function setReturnStore(store: Store) {
    returnStore.value = store
  }

  /** 设置租赁时间 */
  function setRentalTime(startTime: string, endTime: string) {
    rentalTime.value = { startTime, endTime }
  }

  /** 设置保险类型 */
  function setInsuranceType(type: 'basic' | 'premium' | 'none') {
    insuranceType.value = type
  }

  /** 设置优惠券 */
  function setCoupon(couponId: number | undefined) {
    selectedCouponId.value = couponId
  }

  /** 设置价格预览 */
  function setFeePreview(fee: FeeDetail | null) {
    feePreview.value = fee
  }

  /** 设置当前操作订单 */
  function setCurrentOrder(order: Order | null) {
    currentOrder.value = order
  }

  /** 重置所有下单临时数据 */
  function resetOrderDraft() {
    selectedVehicle.value = null
    selectedStore.value = null
    pickupStore.value = null
    returnStore.value = null
    rentalTime.value = { startTime: '', endTime: '' }
    insuranceType.value = 'basic'
    selectedCouponId.value = undefined
    feePreview.value = null
  }

  return {
    // State
    selectedVehicle,
    selectedStore,
    pickupStore,
    returnStore,
    rentalTime,
    insuranceType,
    selectedCouponId,
    feePreview,
    currentOrder,

    // Getters
    rentDays,
    canSubmitOrder,
    totalAmount,
    totalAmountDisplay,

    // Actions
    selectVehicle,
    setPickupStore,
    setReturnStore,
    setRentalTime,
    setInsuranceType,
    setCoupon,
    setFeePreview,
    setCurrentOrder,
    resetOrderDraft,
  }
})
