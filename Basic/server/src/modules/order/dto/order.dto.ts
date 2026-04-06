import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsISO8601,
  IsOptional,
  Min,
  Max,
  IsString,
  MaxLength,
  IsIn,
} from 'class-validator';

/**
 * 创建订单请求 DTO
 */
export class CreateOrderDto {
  @ApiProperty({ description: '车辆ID', example: 1 })
  @IsInt()
  @Min(1)
  vehicleId: number;

  @ApiProperty({ description: '取车时间 ISO 8601', example: '2026-04-10T09:00:00.000Z' })
  @IsNotEmpty()
  @IsISO8601()
  pickupTime: string;

  @ApiProperty({ description: '还车时间 ISO 8601', example: '2026-04-12T18:00:00.000Z' })
  @IsNotEmpty()
  @IsISO8601()
  returnTime: string;

  @ApiPropertyOptional({ description: '用户优惠券ID', example: 5 })
  @IsOptional()
  @IsInt()
  userCouponId?: number;

  @ApiPropertyOptional({ description: '使用积分数量', example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pointsUsed?: number;
}

/**
 * 取消订单请求 DTO
 */
export class CancelOrderDto {
  @ApiPropertyOptional({ description: '取消原因', example: '计划有变', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

/**
 * 还车请求 DTO
 */
export class ReturnVehicleDto {
  @ApiPropertyOptional({ description: '还车位置纬度', example: 30.5728 })
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ description: '还车位置经度', example: 104.0668 })
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({ description: '还车位置描述', example: '春熙路IFS楼下' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  locationDesc?: string;
}
