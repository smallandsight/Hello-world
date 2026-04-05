/**
 * 统一 API 响应 DTO
 * 所有接口返回值均通过 ResponseInterceptor 自动包装为此格式
 * 对应接口文档规范：{ code, message, data, timestamp }
 */
export class ApiResponse<T = any> {
  /** 业务错误码：0 表示成功 */
  code: number;

  /** 提示信息 */
  message: string;

  /** 响应数据（成功时有值） */
  data: T | null;

  /** 服务端时间戳 (ISO 8601) */
  timestamp: string;
}

/** 分页元数据 */
export class PaginationMeta {
  /** 总记录数 */
  total: number;

  /** 当前页码（从1开始） */
  page: number;

  /** 每页条数 */
  size: number;

  /** 总页数 */
  pages: number;
}

/** 分页响应 DTO */
export class PaginatedResponse<T = any> extends ApiResponse<T[]> {
  /** 分页元数据 */
  pagination: PaginationMeta;
}

/** 创建成功响应 */
export function createSuccessResponse<T>(
  data: T,
  message: string = '操作成功',
): ApiResponse<T> {
  return {
    code: 0,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

/** 创建分页成功响应 */
export function createPaginatedResponse<T>(
  list: T[],
  total: number,
  page: number,
  size: number,
): PaginatedResponse<T> {
  const pages = Math.ceil(total / size);
  return {
    code: 0,
    message: '查询成功',
    data: list,
    timestamp: new Date().toISOString(),
    pagination: {
      total,
      page,
      size,
      pages,
    },
  };
}
