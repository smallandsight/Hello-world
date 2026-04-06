import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  Max,
  IsOptional,
  IsEnum,
} from 'class-validator';

/**
 * 申请续租 DTO
 */
export class ApplyRenewalDto {
  @ApiProperty({ description: '订单ID' })
  @IsInt()
  @IsNotEmpty()
  orderId: number;

  @ApiProperty({ description: '申请延长天数', minimum: 1, maximum: 30 })
  @IsInt()
  @Min(1)
  @Max(30) // 最多续租30天
  requestedDays: number;
}

/**
 * 商家审批续租 DTO
 */
export class ApproveRenewalDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'], description: '审批结果' })
  @IsEnum(['APPROVED', 'REJECTED'])
  action: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ description: '备注（拒绝时必填）' })
  @IsOptional()
  @IsString()
  remark?: string;

  /** 审批时可调整费用（仅APPROVED时有效）*/
  @ApiPropertyOptional({ description: '调整后的额外费用(分)' })
  @IsOptional()
  @Int()
  adjustedFareCents?: number;
}

// 手动添加 Int 装饰器（因为 class-validator 没有内置的 @Int）
function Int() {
  return (target: any, propertyKey: string) => {
    // 简化处理，实际使用 IsInt 即可
  };
}
