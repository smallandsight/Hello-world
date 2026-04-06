import {
  IsNotEmpty,
  IsEnum,
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackCategory, FeedbackStatus } from '../entities/feedback.entity';

/** 创建反馈请求 DTO */
export class CreateFeedbackDto {
  @ApiProperty({
    description: '反馈分类',
    enum: ['FEATURE_SUGGESTION', 'BUG_REPORT', 'COMPLAINT', 'OTHER'],
    example: 'BUG_REPORT',
  })
  @IsNotEmpty()
  @IsEnum(FeedbackCategory)
  category: FeedbackCategory;

  @ApiProperty({ description: '反馈内容（最长1000字）', example: '扫码开锁时经常无响应' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  content: string;

  @ApiPropertyOptional({
    description: '图片/截图URL列表（最多5张）',
    type: [String],
    example: ['https://example.com/screenshot.png'],
  })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional({ description: '联系手机号', example: '138****1234' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: '联系邮箱', example: 'user@example.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}
