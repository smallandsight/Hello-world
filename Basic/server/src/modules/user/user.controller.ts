import {
  Controller,
  Get,
  Put,
  UseGuards,
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

  @Get('info')
  @ApiOperation({ summary: '获取当前用户信息' })
  async getUserInfo(@CurrentUser() payload: any) {
    return this.userService.getUserInfo(Number(payload.sub));
  }

  @Put('info')
  @ApiOperation({ summary: '更新用户信息' })
  async updateUserInfo(
    @CurrentUser() payload: any,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.updateUserInfo(Number(payload.sub), dto);
  }

  @Get('member/info')
  @ApiOperation({ summary: '获取会员信息（等级/积分/权益）' })
  async getMemberInfo(@CurrentUser() payload: any) {
    return this.userService.getMemberInfo(Number(payload.sub));
  }
}
