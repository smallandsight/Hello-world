import {
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  IsArray,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 创建评价请求 DTO */
export class CreateReviewDto {
  @ApiProperty({ description: '关联订单ID', example: 10001 })
  @IsNotEmpty()
  @IsInt()
  orderId: number;

  @ApiProperty({ description: '被评价的车辆ID', example: 2001 })
  @IsNotEmpty()
  @IsInt()
  vehicleId: number;

  @ApiProperty({
    description: '综合评分 (1-5)',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: '评价内容（最长500字）', example: '车况很好，骑行体验很棒！' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  content?: string;

  @ApiPropertyOptional({
    description: '图片URL列表（最多9张）',
    type: [String],
    example: ['https://example.com/img1.jpg'],
  })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional({
    description: '标签列表',
    type: [String],
    example: ['车况好', '干净整洁'],
  })
  @IsOptional()
  @IsArray()
  tags?: string[];
}

/** 回复评价请求 DTO */
export class ReplyReviewDto {
  @ApiProperty({ description: '回复内容', example: '感谢您的评价，我们会继续努力！' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  replyContent: string;
}
