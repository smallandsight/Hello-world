import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

/** 评价列表查询参数 */
export class ReviewQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    description: '最低评分筛选',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({
    description: '最高评分筛选',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  maxRating?: number;

  @ApiPropertyOptional({
    description: '是否只看有图评价',
    example: false,
  })
  @IsOptional()
  hasImages?: boolean;
}
