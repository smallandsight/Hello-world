/**
 * 通用类型定义
 * API 响应、分页等前后端共用类型
 */

/** 统一 API 响应结构 */
export interface IApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

/** 分页元信息 */
export interface IPaginationMeta {
  total: number;
  page: number;
  size: number;
  pages: number;
}

/** 分页响应结构 */
export interface IPageResult<T = any> {
  code: number;
  message: string;
  data: T[];
  pagination: IPaginationMeta;
  timestamp: string;
}

/** 分页参数输入（前端传参） */
export interface IPageQuery {
  page?: number;
  size?: number;
  sort?: string;
}

/** 排序字段描述 */
export interface ISortField {
  field: string;
  order: 'ASC' | 'DESC';
}
