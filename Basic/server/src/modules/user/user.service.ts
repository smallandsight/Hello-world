import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { DriverLicense } from './entities/driver-license.entity';
import { UserLevel } from './entities/user-level.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(DriverLicense)
    private readonly licenseRepo: Repository<DriverLicense>,
    @InjectRepository(UserLevel)
    private readonly levelRepo: Repository<UserLevel>,
  ) {}

  /**
   * 获取用户信息（脱敏输出）
   */
  async getUserInfo(userId: number): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    // TODO: 返回 UserInfoVO（手机号等敏感字段脱敏）
    return user;
  }

  /**
   * 更新用户基本信息
   */
  async updateUserInfo(
    userId: number,
    dto: UpdateUserDto,
  ): Promise<User> {
    await this.userRepo.update(userId, dto);
    return this.userRepo.findOneBy({ id: userId }) as any;
  }

  /**
   * 获取会员信息：当前等级、积分余额、升级进度
   */
  async getMemberInfo(userId: number): Promise<any> {
    // TODO: 查询用户等级 + 积分 + 升级所需条件
    return { message: '待实现：会员信息查询', userId };
  }
}
