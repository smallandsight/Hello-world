import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StaffLoginDto {
  @ApiProperty({ description: '商家账号（手机号或工号）' })
  @IsNotEmpty({ message: '账号不能为空' })
  @IsString()
  account: string;

  @ApiProperty({ description: '密码' })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  password: string;
}
