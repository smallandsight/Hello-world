import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { Staff } from './entities/staff.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { StaffRole } from './entities/staff-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Staff,
      Role,
      Permission,
      RolePermission,
      StaffRole,
    ]),
  ],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService, RoleService],
})
export class StaffModule {}

// 角色服务（与 Staff 同模块）
@Injectable()
export class RoleService {
  // TODO: 角色 CRUD
}
