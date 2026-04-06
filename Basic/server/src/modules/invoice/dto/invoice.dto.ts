import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

// ==================== 抬头管理 ====================

export class CreateTitleDto {
  @ApiProperty({ description: '抬头名称' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  titleName: string;

  @ApiPropertyOptional({ description: '税号/身份证号' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxNo?: string;

  @ApiProperty({ enum: ['PERSONAL', 'COMPANY'], description: '类型', default: 'PERSONAL' })
  @IsEnum(['PERSONAL', 'COMPANY'])
  type: 'PERSONAL' | 'COMPANY' = 'PERSONAL';

  @ApiPropertyOptional({ description: '地址（企业必填）' })
  @ValidateIf((o) => o.type === 'COMPANY')
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: '电话' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '邮箱' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '开户银行' })
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({ description: '银行账号' })
  @IsOptional()
  bankAccount?: string;

  @ApiPropertyOptional({ default: 0, description: '是否默认' })
  isDefault?: number = 0;
}

export class UpdateTitleDto {
  @ApiPropertyOptional({ description: '抬头名称' })
  @IsOptional()
  @IsString()
  titleName?: string;

  @ApiPropertyOptional({ description: '地址' })
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: '电话' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: '邮箱' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '是否默认' })
  isDefault?: number;
}

// ==================== 发票申请 ====================

export class ApplyInvoiceDto {
  @ApiProperty({ description: '订单ID' })
  @IsInt()
  @IsNotEmpty()
  orderId: number;

  @ApiProperty({ description: '抬头ID' })
  @IsInt()
  @IsNotEmpty()
  titleId: number;

  @ApiProperty({
    enum: ['ELECTRONIC_NORMAL', 'PAPER_NORMAL'],
    description: '发票类型',
    default: 'ELECTRONIC_NORMAL',
  })
  invoiceType?: string = 'ELECTRONIC_NORMAL';
}
