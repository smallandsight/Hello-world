import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AlipayService } from '../third-party/alipay/alipay.service';
import { AlipayLoginDto } from './dto/alipay-login.dto';
import { StaffLoginDto } from './dto/staff-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('认证模块')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly alipayService: AlipayService,
  ) {}

  @Post('alipay/login')
  @HttpCode(200)
  @ApiOperation({ summary: '支付宝小程序登录', description: '使用支付宝授权码换取JWT Token对' })
  @ApiResponse({ status: 200, description: '登录成功，返回 Token 对和用户信息' })
  async alipayLogin(@Body() dto: AlipayLoginDto): Promise<any> {
    const result = await this.authService.loginByAlipay(
      this.alipayService,
      dto.code,
      dto.inviteCode,
    );

    return {
      token: {
        accessToken: result.tokenPair.accessToken,
        refreshToken: result.tokenPair.refreshToken,
        expiresAt: result.tokenPair.expiresAt,
      },
      userId: result.userId,
      isNewUser: result.isNewUser,
      user: result.user,
    };
  }

  @Post('staff/login')
  @HttpCode(200)
  @ApiOperation({ summary: '商家端账号密码登录' })
  @ApiResponse({ status: 200, description: '登录成功，返回 Token 对和员工信息' })
  async staffLogin(@Body() dto: StaffLoginDto): Promise<any> {
    const result = await this.authService.loginByStaffAccount(
      dto.account,
      dto.password,
    );

    return {
      token: {
        accessToken: result.tokenPair.accessToken,
        refreshToken: result.tokenPair.refreshToken,
        expiresAt: result.tokenPair.expiresAt,
      },
      staff: result.staff,
    };
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: '刷新 Token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<any> {
    const tokenPair = await this.authService.refreshUserToken(dto.refreshToken);
    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresAt: tokenPair.expiresAt,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(200)
  @ApiOperation({ summary: '用户端登出' })
  async logoutUser(
    @CurrentUser('sub') userId: string,
    @CurrentUser('userType') userType: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const token = this.extractToken(req);
    await this.authService.logout(Number(userId), userType, token || '');
    return { message: '登出成功' };
  }

  private extractToken(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}
