import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsIn, Min, MaxLength, IsString } from 'class-validator';

/**
 * 创建支付请求 DTO
 */
export class CreatePaymentDto {
  @ApiProperty({ description: '关联订单ID', example: 1 })
  @IsInt()
  @Min(1)
  orderId: number;

  @ApiPropertyOptional({ description: '支付渠道', enum: ['alipay', 'wechat'], default: 'alipay' })
  @IsOptional()
  @IsIn(['alipay', 'wechat'])
  payChannel?: string;

  @ApiPropertyOptional({ description: '支付类型', enum: ['deposit', 'payment', 'preauth'], default: 'payment' })
  @IsOptional()
  @IsIn(['deposit', 'payment', 'preauth'])
  payType?: string;

  @ApiPropertyOptional({ description: '支付金额（分），押金场景需传入', example: 50000 })
  @IsOptional()
  @IsInt()
  amountCents?: number;
}

/**
 * 获取支付参数请求 DTO
 */
export class GetPayParamsDto {
  @ApiProperty({ description: '支付记录ID', example: 1 })
  @IsInt()
  @Min(1)
  paymentId: number;
}

/**
 * 退款请求 DTO
 */
export class RefundRequestDto {
  @ApiProperty({ description: '原支付记录ID', example: 5 })
  @IsInt()
  @Min(1)
  paymentId: number;

  @ApiProperty({ description: '关联订单ID', example: 3 })
  @IsInt()
  @Min(1)
  orderId: number;

  @ApiPropertyOptional({ description: '退款金额（分），不传则全额退款', example: 5000 })
  @IsOptional()
  @IsInt()
  refundAmountCents?: number;

  @ApiPropertyOptional({ description: '退款类型', enum: ['order', 'deposit', 'preauth'], default: 'order' })
  @IsOptional()
  @IsIn(['order', 'deposit', 'preauth'])
  refundType?: string;

  @ApiPropertyOptional({ description: '退款原因', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
