import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  Min,
  Max,
  ValidateIf,
  IsISO8601,
  IsOptional,
} from 'class-validator';

/**
 * 定价规则配置 DTO (T3W9-4)
 *
 * 每种车型可独立设置基础价格和时段系数
 */
export class PricingRuleDto {
  @ApiProperty({ description: '车型ID' })
  @IsInt()
  modelId: number;

  /** 基础价格（元/小时）*/
  @ApiProperty({ description: '基础价(元/小时)', default: 20 })
  @IsNumber()
  @Min(0.1)
  basePricePerHour: number;

  /** 工作日系数（周一到周五，默认1.0）*/
  @ApiProperty({ description: '工作日系数', default: 1.0 })
  @IsNumber()
  @Min(0.5)
  @Max(3.0)
  weekdayFactor?: number = 1.0;

  /** 周末系数（周六日，默认1.2）*/
  @ApiProperty({ description: '周末系数', default: 1.2 })
  @IsNumber()
  @Min(0.5)
  @Max(3.0)
  weekendFactor?: number = 1.2;

  /** 节假日系数（默认1.5）*/
  @ApiProperty({ description: '节假日系数', default: 1.5 })
  @IsNumber()
  @Min(0.5)
  @Max(3.0)
  holidayFactor?: number = 1.5;

  /** 旺季系数（如暑期/国庆等，默认1.3）*/
  @ApiProperty({ description: '旺季系数', default: 1.3 })
  @IsNumber()
  @Min(0.5)
  @Max(3.0)
  peakSeasonFactor?: number = 1.3;

  /** 日租金封顶（元/天，可选）*/
  @ApiProperty({ description: '日租金封顶(元/天)', required: false, nullable: true })
  @ValidateIf((o) => o.dailyCap !== null && o.dailyCap !== undefined)
  @IsNumber()
  @Min(0)
  dailyCap?: number | null = null;

  /** 最短租期（小时）*/
  @ApiProperty({ description: '最短租期(小时)', default: 1 })
  @IsInt()
  @Min(1)
  minRentalHours?: number = 1;
}

/**
 * 批量更新定价规则
 */
export class BatchUpdatePricingDto {
  @ApiProperty({ type: [PricingRuleDto], description: '定价规则列表' })
  rules: PricingRuleDto[];
}

/**
 * 价格试算请求
 */
export class CalculatePriceDto {
  @ApiProperty({ description: '车型ID' })
  @IsInt()
  vehicleModelId: number;

  @ApiProperty({ description: '取车时间', example: '2026-04-10T09:00:00Z' })
  @IsISO8601()
  pickupTime: string;

  @ApiProperty({ description: '还车时间', example: '2026-04-12T18:00:00Z' })
  @IsISO8601()
  returnTime: string;

  /** 用户会员等级（用于折扣计算，可选）*/
  @ApiProperty({ description: '用户会员等级', required: false, nullable: true })
  @IsOptional()
  @IsInt()
  memberLevel?: number | null = null;

  /** 是否使用优惠券 */
  @ApiProperty({ description: '优惠券抵扣金额(分)', required: false, nullable: true })
  @IsOptional()
  @IsInt()
  couponDiscountCents?: number | null = null;
}

/**
 * 试算结果
 */
export interface PriceCalculationResult {
  vehicleModelId: number;
  pickupTime: string;
  returnTime: string;
  rentalHours: number;
  baseFareCents: number;        // 基础费用(分)
  timeFactor: number;           // 时段系数
  memberDiscountRate: number;   // 会员折扣率
  memberDiscountCents: number;  // 会员优惠金额(分)
  couponDiscountCents: number;  // 券抵扣(分)
  totalFareCents: number;       // 最终总价(分)
  priceBreakdown: Array<{
    period: string;
    hours: number;
    rate: number;
    subtotalCents: number;
  }>;
}
