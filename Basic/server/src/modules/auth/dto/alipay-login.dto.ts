import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AlipayLoginDto {
  @ApiProperty({ description: '支付宝授权码（通过 my.getAuthCode 获取）', example: 'alipay_auth_code_xxx' })
  @IsNotEmpty({ message: '授权码不能为空' })
  @IsString()
  code: string;

  @ApiProperty({ description: '邀请码（可选）', required: false })
  @IsOptional()
  @IsString()
  inviteCode?: string;
}
