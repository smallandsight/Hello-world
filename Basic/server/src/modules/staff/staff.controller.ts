import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffAuthGuard } from '../../common/guards/staff-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Permissions } from '../../common/decorators/permissions.decorator';
import { StaffService } from './staff.service';
import {
  CreateStaffDto,
  UpdateStaffDto,
  AssignRolesDto,
  ResetPasswordDto,
  QueryStaffDto,
} from './dto/staff.dto';

@ApiTags('商家端 - 员工管理')
@ApiBearerAuth('staff-token')
@Controller('staff')
@UseGuards(StaffAuthGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  // ==================== 当前员工信息 ====================

  @Get('profile')
  @ApiOperation({ summary: '获取当前员工信息(含权限)' })
  async getProfile(@Body() payload: any) {
    return this.staffService.getStaffDetail(payload.sub);
  }

  // ==================== 角色管理 ====================

  @Get('role/list')
  @Permissions('role:view')
  @ApiOperation({ summary: '获取所有角色列表' })
  async getRoleList() {
    return this.staffService.listRoles();
  }

  // ==================== 员工 CRUD（管理员）====================

  @Post()
  @Roles('admin', 'manager')
  @Permissions('staff:create')
  @ApiOperation({ summary: '添加员工账号' })
  async create(@Body() dto: CreateStaffDto) {
    return this.staffService.createStaff(dto);
  }

  @Get('list')
  @Roles('admin', 'manager')
  @Permissions('staff:view')
  @ApiOperation({ summary: '员工列表（分页+筛选）' })
  async list(@Query() query: QueryStaffDto) {
    return this.staffService.listStaff(query);
  }

  @Get(':id/detail')
  @Roles('admin', 'manager')
  @Permissions('staff:view')
  @ApiOperation({ summary: '员工详情' })
  async getDetail(@Param('id') id: string) {
    return this.staffService.getStaffDetail(Number(id));
  }

  @Put(':id')
  @Roles('admin', 'manager')
  @Permissions('staff:update')
  @ApiOperation({ summary: '更新员工信息' })
  async update(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staffService.updateStaff(Number(id), dto);
  }

  @Put(':id/status')
  @Roles('admin')
  @Permissions('staff:disable')
  @ApiOperation({ summary: '启用/禁用员工' })
  async toggleStatus(@Param('id') id: string) {
    return this.staffService.toggleStatus(Number(id));
  }

  @Put(':id/roles')
  @Roles('admin', 'manager')
  @Permissions('staff:assign_role')
  @ApiOperation({ summary: '分配角色给员工' })
  async assignRoles(@Param('id') id: string, @Body() dto: AssignRolesDto) {
    return this.staffService.assignRoles(Number(id), dto);
  }

  @Put(':id/password')
  @Roles('admin', 'manager')
  @Permissions('staff:reset_password')
  @ApiOperation({ summary: '重置员工密码' })
  async resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.staffService.resetPassword(Number(id), dto);
  }
}
