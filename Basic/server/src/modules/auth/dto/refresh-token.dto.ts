import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh Token' })
  @IsNotEmpty({ message: 'RefreshToken 不能为空' })
  @IsString()
  refreshToken: string;
}
