import {
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffAuthGuard } from '../../common/guards/staff-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Permissions } from '../../common/decorators/permissions.decorator';
import { StaffService } from './staff.service';
import { PageQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('商家端 - 权限管理')
@ApiBearerAuth('staff-token')
@Controller('staff')
@UseGuards(StaffAuthGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('profile')
  @ApiOperation({ summary: '获取当前员工信息' })
  async getProfile(@Body() payload: any) {
    return this.staffService.getStaffProfile(payload.sub);
  }

  @Get('role/list')
  @Permissions('role:view')
  @ApiOperation({ summary: '角色列表（权限管理）' })
  async getRoleList() {
    return this.staffService.getRoleList();
  }

  @Get('list')
  @Roles('admin', 'manager')
  @Permissions('staff:view')
  @ApiOperation({ summary: '员工列表（仅管理员）' })
  async getStaffList(@Query() query: PageQueryDto) {
    return this.staffService.getStaffList(query);
  }
}
