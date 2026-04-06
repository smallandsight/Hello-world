import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  UseGuards,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('用户模块')
@ApiBearerAuth('access-token')
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ==================== 基本信息 ====================

  @Get('info')
  @ApiOperation({ summary: '获取当前用户信息（脱敏）' })
  async getUserInfo(@CurrentUser() payload: any) {
    return this.userService.getUserInfo(Number(payload.sub));
  }

  @Put('info')
  @ApiOperation({ summary: '更新用户基本信息' })
  async updateUserInfo(
    @CurrentUser() payload: any,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.updateUserInfo(Number(payload.sub), dto);
  }

  // ==================== 手机号绑定 ====================

  @Post('bind-phone')
  @ApiOperation({ summary: '绑定手机号', description: '绑定/更换手机号，需短信验证码' })
  async bindPhone(
    @CurrentUser() payload: any,
    @Body() body: { phone: string; code?: string },
  ) {
    return this.userService.bindPhone(
      Number(payload.sub),
      body.phone,
      body.code,
    );
  }

  // ==================== 会员体系 ====================

  @Get('member/info')
  @ApiOperation({ summary: '会员信息', description: '等级、积分、升级进度、权益列表' })
  async getMemberInfo(@CurrentUser() payload: any) {
    return this.userService.getMemberInfo(Number(payload.sub));
  }

  @Get('member/progress')
  @ApiOperation({ summary: '会员等级升级进度', description: '当前消费金额 vs 下一级门槛，含进度百分比' })
  async getMemberProgress(@CurrentUser() payload: any) {
    return this.userService.getLevelProgress(Number(payload.sub));
  }

  // ==================== 驾驶证认证 ====================

  @Get('license/status')
  @ApiOperation({ summary: '驾驶证认证状态' })
  async getLicenseStatus(@CurrentUser() payload: any) {
    return this.userService.getDriverLicenseStatus(Number(payload.sub));
  }

  @Post('license')
  @ApiOperation({ summary: '提交驾驶证认证' })
  async submitLicense(
    @CurrentUser() payload: any,
    @Body() body: {
      name: string;
      licenseNo: string;
      licenseClass: string;
      issueDate: string;
      expireDate: string;
      frontImg: string;
      backImg: string;
    },
  ) {
    return this.userService.submitDriverLicense(Number(payload.sub), body);
  }

  // ==================== 收藏管理 ====================

  @Post('favorite/:vehicleId')
  @ApiOperation({ summary: '收藏车辆' })
  async addFavorite(
    @CurrentUser() payload: any,
    @Param('vehicleId') vehicleId: string,
  ) {
    return this.userService.addFavorite(
      Number(payload.sub),
      Number(vehicleId),
    );
  }

  @Delete('favorite/:vehicleId')
  @ApiOperation({ summary: '取消收藏' })
  async removeFavorite(
    @CurrentUser() payload: any,
    @Param('vehicleId') vehicleId: string,
  ) {
    return this.userService.removeFavorite(
      Number(payload.sub),
      Number(vehicleId),
    );
  }

  @Get('favorites')
  @ApiOperation({ summary: '我的收藏列表' })
  async getFavorites(
    @CurrentUser() payload: any,
  ) {
    return this.userService.getFavorites(Number(payload.sub), {});
  }
}
