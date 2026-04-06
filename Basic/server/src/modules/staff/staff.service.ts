import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import { Repository, Like, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Staff } from './entities/staff.entity';
import { Role } from './entities/role.entity';
import { StaffRole } from './entities/staff-role.entity';
import { Permission } from './entities/permission.entity';
import {
  CreateStaffDto,
  UpdateStaffDto,
  AssignRolesDto,
  ResetPasswordDto,
  QueryStaffDto,
} from './dto/staff.dto';

/** 密码哈希轮数 */
const BCRYPT_SALT_ROUNDS = 10;

/** 默认初始密码 */
const DEFAULT_PASSWORD = 'Gy@2026init';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(StaffRole)
    private readonly staffRoleRepo: Repository<StaffRole>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
  ) {}

  // ==================== 员工 CRUD ====================

  /**
   * 创建员工账号
   */
  async createStaff(dto: CreateStaffDto) {
    // 校验工号唯一
    const existingNo = await this.staffRepo.findOne({
      where: { staffNo: dto.staffNo },
      withDeleted: true,
    });
    if (existingNo) {
      throw new BadRequestException(`工号 "${dto.staffNo}" 已存在`);
    }

    // 校验账号唯一
    const existingAccount = await this.staffRepo.findOne({
      where: { account: dto.account },
      withDeleted: true,
    });
    if (existingAccount) {
      throw new BadRequestException(`登录账号 "${dto.account}" 已存在`);
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(dto.password || DEFAULT_PASSWORD, BCRYPT_SALT_ROUNDS);

    const staff = this.staffRepo.create({
      staffNo: dto.staffNo,
      account: dto.account,
      passwordHash,
      realName: dto.realName,
      phone: dto.phone,
      avatarUrl: dto.avatarUrl,
      storeId: dto.storeId || null,
      status: 0, // 正常
      loginCount: 0,
    });

    const saved = await this.staffRepo.save(staff);

    // 分配角色（事务内）
    if (dto.roleIds && dto.roleIds.length > 0) {
      await this.assignRolesInternal(saved.id, dto.roleIds);
    }

    return this.formatStaffDetail(saved);
  }

  /**
   * 员工列表（分页 + 筛选）
   */
  async listStaff(query: QueryStaffDto) {
    const page = query.page || 1;
    const size = Math.min(query.size || 20, 100);
    const skip = (page - 1) * size;

    const qb = this.staffRepo
      .createQueryBuilder('staff')
      .leftJoinAndSelect('staff.roles', 'roles')
      .where('staff.deleted_at IS NULL');

    if (query.keyword) {
      qb.andWhere(
        '(staff.staff_no LIKE :kw OR staff.real_name LIKE :kw OR staff.phone LIKE :kw OR staff.account LIKE :kw)',
        { kw: `%${query.keyword}%` },
      );
    }
    if (query.status !== undefined && query.status !== null) {
      qb.andWhere('staff.status = :status', { status: query.status });
    }
    if (query.storeId) {
      qb.andWhere('staff.store_id = :storeId', { storeId: query.storeId });
    }
    if (query.roleId) {
      qb.andWhere('roles.id = :roleId', { roleId: query.roleId });
    }

    const [list, total] = await qb
      .orderBy('staff.createdAt', 'DESC')
      .skip(skip)
      .take(size)
      .getManyAndCount();

    return {
      list: list.map((s) => this.formatStaffListItem(s)),
      total,
      page,
      size,
      pages: Math.ceil(total / size),
    };
  }

  /**
   * 员工详情
   */
  async getStaffDetail(id: number) {
    const staff = await this.staffRepo.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });
    if (!staff) throw new NotFoundException('员工不存在');
    return this.formatStaffDetail(staff);
  }

  /**
   * 更新员工信息
   */
  async updateStaff(id: number, dto: UpdateStaffDto) {
    const staff = await this.staffRepo.findOneBy({ id });
    if (!staff) throw new NotFoundException('员工不存在');

    Object.assign(staff, dto);
    await this.staffRepo.save(staff);

    return this.formatStaffDetail(staff);
  }

  /**
   * 启用/禁用员工
   */
  async toggleStatus(id: number) {
    const staff = await this.staffRepo.findOneBy({ id });
    if (!staff) throw new NotFoundException('员工不存在');

    const newStatus = staff.status === 0 ? 1 : 0;
    await this.staffRepo.update(id, { status: newStatus });

    // 禁用时清除其 Token 缓存（由 AuthGuard 层处理）

    return {
      message: newStatus === 1 ? '员工已禁用' : '员工已启用',
      staffId: id,
      previousStatus: staff.status,
      newStatus,
    };
  }

  /**
   * 分配角色（事务操作）
   */
  async assignRoles(staffId: number, dto: AssignRolesDto) {
    const staff = await this.staffRepo.findOneBy({ id: staffId });
    if (!staff) throw new NotFoundException('员工不存在');

    // 验证角色存在
    const roles = await this.roleRepo.find({
      where: { id: In(dto.roleIds), isActive: 1 },
    });
    if (roles.length === 0) {
      throw new BadRequestException('未找到有效的角色');
    }
    if (roles.length < dto.roleIds.length) {
      const foundIds = roles.map((r) => r.id);
      const invalid = dto.roleIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(`以下角色ID无效或已停用：${invalid.join(', ')}`);
    }

    await this.assignRolesInternal(staffId, dto.roleIds);
    return { message: '角色分配成功', staffId, assignedRoles: roles.map((r) => ({ id: r.id, name: r.name })) };
  }

  /**
   * 重置密码
   */
  async resetPassword(id: number, dto: ResetPasswordDto) {
    const staff = await this.staffRepo.findOneBy({ id });
    if (!staff) throw new NotFoundException('员工不存在');

    if (!dto.newPassword || dto.newPassword.length < 6 || dto.newPassword.length > 20) {
      throw new BadRequestException('密码长度需在6-20位之间');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);
    await this.staffRepo.update(id, { passwordHash });

    return { message: '密码重置成功', staffId: id };
  }

  // ==================== 角色管理 ====================

  /**
   * 获取所有角色列表
   */
  async listRoles() {
    const roles = await this.roleRepo.find({
      where: { isActive: 1 },
      order: { createdAt: 'ASC' },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      description: r.description,
      permissionCount: r.permissions?.length || 0,
    }));
  }

  /**
   * 根据用户ID获取其所有权限码
   * 用于权限校验中间件
   */
  async getUserPermissions(staffId: number): Promise<string[]> {
    const staff = await this.staffRepo.findOne({
      where: { id: staffId },
      relations: ['roles', 'roles.permissions'],
    });

    if (!staff || !staff.roles) return [];

    const permissions = new Set<string>();
    for (const role of staff.roles) {
      if (role.permissions) {
        for (const perm of role.permissions) {
          permissions.add(perm.code);
        }
      }
    }

    return Array.from(permissions);
  }

  // ==================== 内部方法 ====================

  /**
   * 内部：分配角色（替换式）
   */
  private async assignRolesInternal(staffId: number, roleIds: number[]) {
    // 先删除旧关联
    await this.staffRoleRepo.delete({ staffId } as any);

    // 批量插入新关联
    for (const roleId of roleIds) {
      await this.staffRoleRepo.insert({
        staffId,
        roleId,
      } as any);
    }
  }

  /**
   * 格式化列表项（不含密码等敏感字段）
   */
  private formatStaffListItem(staff: Staff): any {
    return {
      id: staff.id,
      staffNo: staff.staffNo,
      realName: staff.realName,
      phone: staff.phone ? this.maskPhone(staff.phone) : null,
      account: this.maskAccount(staff.account),
      avatarUrl: staff.avatarUrl,
      storeId: staff.storeId,
      status: staff.status,
      statusLabel: STAFF_STATUS_MAP[staff.status] || '未知',
      lastLoginAt: staff.lastLoginAt?.toISOString(),
      loginCount: staff.loginCount,
      roles: staff.roles?.map((r) => ({ id: r.id, name: r.name, code: r.code })) || [],
      createdAt: staff.createdAt.toISOString(),
    };
  }

  /**
   * 格式化详情
   */
  private formatStaffDetail(staff: Staff): any {
    const base = this.formatStaffListItem(staff);

    return {
      ...base,
      // 详情中展示完整手机号
      phone: staff.phone,
      updatedAt: staff.updatedAt.toISOString(),
      permissions: staff.roles
        ?.flatMap((r) => r.permissions?.map((p) => p.code) || [])
        .filter(Boolean),
    };
  }

  /** 手机号脱敏 */
  private maskPhone(phone: string | null): string | null {
    if (!phone || phone.length < 7) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
  }

  /** 账号脱敏 */
  private maskAccount(account: string): string {
    if (!account) return '';
    if (/^\d+$/.test(account)) {
      // 纯数字视为手机号，脱敏
      return account.substring(0, 3) + '****' + account.substring(account.length - 4);
    }
    // 邮箱脱敏
    const atIdx = account.indexOf('@');
    if (atIdx > 2) {
      return account.substring(0, 2) + '***' + account.substring(atIdx - 1);
    }
    return '****';
  }
}

/** 员工状态映射 */
const STAFF_STATUS_MAP: Record<number, string> = {
  0: '正常',
  1: '禁用',
  2: '锁定',
};
