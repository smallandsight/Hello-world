import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  Min,
  IsNotEmpty,
  IsString,
  IsOptional,
} from 'class-validator';

/**
 * 充值DTO
 */
export class RechargeDto {
  @ApiProperty({ description: '充值金额(分)', example: 10000 })
  @IsInt()
  @IsNotEmpty()
  @Min(100)
  amountCents: number;

  @ApiPropertyOptional({ description: '支付方式', enum: ['alipay', 'wechat'] })
  @IsOptional()
  @IsString()
  payMethod?: string = 'alipay';
}
