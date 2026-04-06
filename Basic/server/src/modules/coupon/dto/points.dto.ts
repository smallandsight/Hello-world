import {
  IsOptional,
  IsInt,
  IsEnum,
  IsString,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

/** 积分变动类型 */
export enum PointsActionType {
  /** 订单完成 */
  ORDER_COMPLETE = 'ORDER_COMPLETE',
  /** 签到 */
  SIGN_IN = 'SIGN_IN',
  /** 评价 */
  REVIEW = 'REVIEW',
  /** 邀请好友 */
  INVITE = 'INVITE',
  /** 管理员调整 */
  ADMIN_ADJUST = 'ADMIN_ADJUST',
  /** 积分抵扣 */
  DEDUCT = 'DEDUCT',
  /** 积分退款退还 */
  REFUND = 'REFUND',
}

/** 积分记录查询参数（含分页） */
export class PointsRecordQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    description: '变动类型筛选',
    enum: ['earn', 'spend', 'expire', 'refund', 'adjust'],
  })
  @IsOptional()
  @IsEnum(['earn', 'spend', 'expire', 'refund', 'adjust'])
  changeType?: string;

  @ApiPropertyOptional({ description: '开始日期 (YYYY-MM-DD)', example: '2026-04-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期 (YYYY-MM-DD)', example: '2026-04-30' })
  @IsOptional()
  @IsString()
  endDate?: string;
}

/** 手动调整积分请求（管理端） */
export class AdjustPointsDto {
  @ApiProperty({ description: '变动积分数量（正=增加，负=扣减）', example: 100 })
  @IsNotEmpty()
  @IsInt()
  pointsChange: number;

  @ApiPropertyOptional({ description: '调整原因', example: '活动奖励' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/** 扣减积分请求 */
export class DeductPointsDto {
  @ApiProperty({ description: '扣减积分数量', example: 50 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ description: '扣减原因', example: '兑换商品' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: '关联订单ID', example: null })
  @IsOptional()
  @IsInt()
  orderId?: number;
}
