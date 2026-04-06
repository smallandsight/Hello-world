import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 冻结违章押金 DTO
 * 还车时自动触发
 */
export class FreezeViolationDepositDto {
  @ApiProperty({ description: '订单ID' })
  @IsInt()
  @IsNotEmpty()
  orderId: number;

  @ApiProperty({ description: '车辆ID' })
  @IsInt()
  vehicleId: number;

  @ApiProperty({ description: '冻结金额(分)', example: 50000 })
  @IsInt()
  @Min(100)
  amountCents: number;

  @ApiProperty({ description: '观察期天数', default: 30 })
  @IsInt()
  observationDays?: number = 30;
}

/**
 * 扣除违章押金 DTO
 */
export class DeductViolationDto {
  @ApiProperty({ description: '扣除金额(分)' })
  @IsInt()
  @Min(1)
  deductionAmountCents: number;

  @ApiProperty({
    type: Object,
    description: '违章详情',
    example: { time: '2026-04-05', location: '人民路与建设路路口', type: '闯红灯', fine: 200, points: 6 },
  })
  violationDetail?: any;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}

/**
 * 退还违章押金 DTO
 */
export class RefundViolationDto {
  @ApiPropertyOptional({ description: '退还金额(分)，不填则全额退' })
  @IsOptional()
  @IsInt()
  refundAmountCents?: number;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}

/**
 * 商家端查询违章记录列表
 */
export class QueryViolationDto {
  @ApiPropertyOptional({ default: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  size?: number = 20;

  @ApiPropertyOptional({ description: '状态筛选' })
  @IsOptional()
  @IsEnum(['FROZEN', 'DEDUCTED', 'REFUNDED', 'PARTIAL_REFUND'])
  status?: string;

  @ApiPropertyOptional({ description: '用户ID' })
  userId?: number;
}
