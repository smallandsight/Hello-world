import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 通用分页查询参数 DTO
 * 所有列表接口均继承此基类，提供统一的 page/size/sort 分页能力
 */
export class PageQueryDto {
  @ApiPropertyOptional({ description: '页码（从1开始）', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页条数', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number = 20;

  @ApiPropertyOptional({
    description: '排序字段（如 createdAt,-updatedAt）',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  /** 计算 MySQL OFFSET */
  get offset(): number {
    return ((this.page || 1) - 1) * (this.size || 20);
  }

  /** 获取解析后的排序列表 [{field, order}] */
  get sortFields(): Array<{ field: string; order: 'ASC' | 'DESC' }> {
    if (!this.sort) return [];
    return this.sort.split(',').map((s) => {
      const trimmed = s.trim();
      if (trimmed.startsWith('-')) {
        return { field: trimmed.slice(1), order: 'DESC' as const };
      }
      return { field: trimmed, order: 'ASC' as const };
    });
  }
}
