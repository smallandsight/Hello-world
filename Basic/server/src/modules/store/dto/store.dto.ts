import { IsString, IsOptional, IsNumber, Min, Max, IsInt, IsBoolean, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

/**
 * 创建门店 DTO
 */
export class CreateStoreDto {
  @ApiProperty({ description: '门店名称', example: '古月租车·朝阳店' })
  @IsString()
  storeName: string;

  @ApiProperty({ description: '门店编码', example: 'GY001' })
  @IsString()
  storeCode: string;

  @ApiProperty({ description: '省份', example: '北京市' })
  @IsString()
  province: string;

  @ApiProperty({ description: '城市', example: '北京市' })
  @IsString()
  city: string;

  @ApiPropertyOptional({ description: '区县', example: '朝阳区' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({ description: '详细地址', example: '建国路88号' })
  @IsString()
  address: string;

  @ApiProperty({ description: '纬度', example: 39.908722 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: '经度', example: 116.397499 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ description: '联系电话', example: '010-88889999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '营业开始时间', default: '08:00', example: '08:00' })
  @IsOptional()
  @IsString()
  openTime?: string;

  @ApiPropertyOptional({ description: '营业结束时间', default: '22:00', example: '22:00' })
  @IsOptional()
  @IsString()
  closeTime?: string;

  @ApiPropertyOptional({ description: '服务半径(米)', default: 3000, example: 5000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(50000)
  serviceRadiusMeters?: number;

  @ApiPropertyOptional({ description: '排序权重', default: 0, example: 10 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

/**
 * 更新门店 DTO
 */
export class UpdateStoreDto {
  @ApiPropertyOptional({ description: '门店名称' })
  @IsOptional()
  @IsString()
  storeName?: string;

  @ApiPropertyOptional({ description: '省份' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: '城市' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: '区县' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: '详细地址' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: '纬度' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: '经度' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: '联系电话' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '营业开始时间' })
  @IsOptional()
  @IsString()
  openTime?: string;

  @ApiPropertyOptional({ description: '营业结束时间' })
  @IsOptional()
  @IsString()
  closeTime?: string;

  @ApiPropertyOptional({ description: '服务半径(米)' })
  @IsOptional()
  @IsInt()
  serviceRadiusMeters?: number;

  @ApiPropertyOptional({ description: '排序权重' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '是否启用：0停用 1启用' })
  @IsOptional()
  @IsIn([0, 1])
  isActive?: number;
}

/**
 * 查询门店列表 DTO（支持分页 + LBS + 筛选）
 */
export class QueryStoreDto extends PageQueryDto {
  @ApiPropertyOptional({ description: '关键词(搜索名称/编码/地址)' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '城市筛选', example: '北京市' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: '仅查启用的门店' })
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1])
  isActive?: number;

  // ========== LBS 查询参数 ==========

  /** 查询中心点纬度（与 lng 配合使用） */
  @ApiPropertyOptional({ description: '查询中心点纬度(LBS查询)' })
  @IsOptional()
  @IsNumber()
  lat?: number;

  /** 查询中心点经度（与 lat 配合使用） */
  @ApiPropertyOptional({ description: '查询中心点经度(LBS查询)' })
  @IsOptional()
  @IsNumber()
  lng?: number;

  /** LBS 查询半径(米)，默认 10000m (10km) */
  @ApiPropertyOptional({ description: 'LBS查询半径(米)', default: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(50000)
  radius?: number;
}
