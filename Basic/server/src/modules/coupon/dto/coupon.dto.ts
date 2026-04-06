import { IsNotEmpty, IsOptional, IsEnum, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ========== 用户端 DTO ==========

/** 领取优惠券请求 */
export class ClaimCouponDto {
  @ApiProperty({ description: '领取渠道', enum: ['activity', 'share', 'gift', 'register'], example: 'activity' })
  @IsNotEmpty()
  @IsEnum(['activity', 'share', 'gift', 'register'])
  channel: string;
}

/** 使用优惠券请求 */
export class UseCouponDto {
  @ApiProperty({ description: '用户优惠券ID', example: 1 })
  @IsNotEmpty()
  @Min(1)
  userCouponId: number;

  @ApiProperty({ description: '关联订单ID', example: 10001 })
  @IsNotEmpty()
  @Min(1)
  orderId: number;
}

/** 我的优惠券列表查询参数 */
export class CouponListQueryDto {
  @ApiPropertyOptional({
    description: '状态筛选',
    enum: ['available', 'used', 'expired'],
    example: 'available',
  })
  @IsOptional()
  @IsEnum(['available', 'used', 'expired'])
  status?: string;
}

// ========== 管理端 DTO ==========

/** 创建优惠券模板请求 */
export class CreateCouponDto {
  @ApiProperty({ description: '券名称', example: '新用户专享5元券' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: '优惠类型', enum: ['fixed', 'percent'], example: 'fixed' })
  @IsNotEmpty()
  @IsEnum(['fixed', 'percent'])
  discountType: 'fixed' | 'percent';

  @ApiProperty({ description: '优惠值（金额或折扣百分比）', example: 5 })
  @IsNotEmpty()
  @Min(0.01)
  value: number;

  @ApiPropertyOptional({ description: '最低消费金额', example: 0 })
  @IsOptional()
  minAmount?: number = 0;

  @ApiProperty({ description: '发放总量', example: 1000 })
  @IsNotEmpty()
  @Min(1)
  totalQuantity: number;

  @ApiProperty({ description: '每人限领数量', example: 1 })
  @IsNotEmpty()
  @Min(1)
  limitPerUser: number;

  @ApiProperty({ description: '有效期开始时间（ISO格式）', example: '2026-04-06T00:00:00Z' })
  @IsNotEmpty()
  validFrom: string;

  @ApiProperty({ description: '有效期结束时间（ISO格式）', example: '2026-06-30T23:59:59Z' })
  @IsNotEmpty()
  validTo: string;
}
