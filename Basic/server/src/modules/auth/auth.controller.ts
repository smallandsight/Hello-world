import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AlipayLoginDto } from './dto/alipay-login.dto';
import { StaffLoginDto } from './dto/staff-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('认证模块')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('alipay/login')
  @HttpCode(200)
  @ApiOperation({ summary: '支付宝小程序登录' })
  @ApiResponse({ status: 200, description: '登录成功，返回 Token 对' })
  async alipayLogin(@Body() dto: AlipayLoginDto): Promise<any> {
    // TODO: 实现支付宝 code → sessionKey → user 查询/创建
    // const user = await this.userService.findOrCreateByAlipay(dto.code);
    // return this.authService.signUserTokens(user.id);
    return { message: '待实现：支付宝登录逻辑', data: dto };
  }

  @Post('staff/login')
  @HttpCode(200)
  @ApiOperation({ summary: '商家端账号密码登录' })
  async staffLogin(@Body() dto: StaffLoginDto): Promise<any> {
    // TODO: 实现商家账号密码验证
    return { message: '待实现：商家登录逻辑', data: dto };
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: '刷新 Token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<any> {
    return this.authService.refreshUserToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(200)
  @ApiOperation({ summary: '用户端登出' })
  async logoutUser(
    @CurrentUser('sub') userId: string,
    @CurrentUser('userType') userType: string,
    @CurrentUser() payload: any,
  ): Promise<{ message: string }> {
    const token = (payload.raw || '').toString();
    await this.authService.logout(Number(userId), userType, token);
    return { message: '登出成功' };
  }
}
