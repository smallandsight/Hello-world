// ==================== 通用响应类型 ====================

/** 统一 API 响应格式 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp?: number
}

/** 分页元数据 */
export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** 分页响应 */
export interface PaginatedResponse<T = any> {
  list: T[]
  pagination: PaginationMeta
}
