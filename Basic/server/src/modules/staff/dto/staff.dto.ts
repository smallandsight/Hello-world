import { IsString, IsOptional, IsInt, Min, Max, IsArray, IsIn, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageQueryDto } from '../../../common/dto/pagination.dto';

/**
 * 创建员工 DTO
 */
export class CreateStaffDto {
  @ApiProperty({ description: '工号', example: 'STF001' })
  @IsString()
  staffNo: string;

  @ApiProperty({ description: '登录账号(手机号)', example: '13800138000' })
  @IsString()
  account: string;

  @ApiProperty({ description: '初始密码(6-20位)', example: 'Abc@123456' })
  @IsString()
  password: string;

  @ApiProperty({ description: '真实姓名', example: '张三' })
  @IsString()
  realName: string;

  @ApiPropertyOptional({ description: '手机号', example: '13800138000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '头像URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '所属门店ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  storeId?: number;

  @ApiPropertyOptional({ description: '分配的角色ID列表', type: [Number], example: [1, 2] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  roleIds?: number[];
}

/**
 * 更新员工 DTO
 */
export class UpdateStaffDto {
  @ApiPropertyOptional({ description: '真实姓名' })
  @IsOptional()
  @IsString()
  realName?: string;

  @ApiPropertyOptional({ description: '手机号' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '头像URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '所属门店ID' })
  @IsOptional()
  @Type(() => Number)
  storeId?: number;
}

/**
 * 分配角色 DTO
 */
export class AssignRolesDto {
  @ApiProperty({ description: '角色ID列表', type: [Number], example: [1, 3] })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  roleIds: number[];
}

/**
 * 重置密码 DTO
 */
export class ResetPasswordDto {
  @ApiProperty({ description: '新密码(6-20位)' })
  @IsString()
  newPassword: string;
}

/**
 * 查询员工列表 DTO
 */
export class QueryStaffDto extends PageQueryDto {
  @ApiPropertyOptional({ description: '关键词(工号/姓名/手机号)' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '状态：0正常 1禁用 2锁定' })
  @IsOptional()
  @IsIn([0, 1, 2])
  status?: number;

  @ApiPropertyOptional({ description: '门店ID筛选' })
  @IsOptional()
  @Type(() => Number)
  storeId?: number;

  @ApiPropertyOptional({ description: '角色ID筛选' })
  @IsOptional()
  @Type(() => Number)
  roleId?: number;
}
