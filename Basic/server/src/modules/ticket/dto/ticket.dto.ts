import { IsString, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

/**
 * 创建工单 DTO
 */
export class CreateTicketDto {
  @ApiProperty({ description: '工单类型', example: 'problem' })
  @IsIn(['complaint', 'problem', 'accident', 'other'])
  ticketType: string;

  @ApiProperty({ description: '工单标题', example: '车辆无法启动' })
  @IsString()
  title: string;

  @ApiProperty({ description: '问题描述详情' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '关联订单ID' })
  @IsOptional()
  @Type(() => Number)
  orderId?: number;

  @ApiPropertyOptional({ description: '图片附件URL数组', type: [String] })
  @IsOptional()
  images?: string[];
}

/**
 * 查询工单列表 DTO
 */
export class QueryTicketDto extends PageQueryDto {
  @ApiPropertyOptional({ description: '关键词(标题/内容/编号)' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '状态筛选' })
  @IsOptional()
  @Type(() => Number)
  status?: number;

  @ApiPropertyOptional({ description: '类型筛选' })
  @IsOptional()
  @IsString()
  ticketType?: string;

  @ApiPropertyOptional({ description: '优先级筛选(1-4)' })
  @IsOptional()
  @Type(() => Number)
  priority?: number;

  @ApiPropertyOptional({ description: '处理人筛选(员工ID)' })
  @IsOptional()
  @Type(() => Number)
  assigneeId?: number;
}
