import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { Activity } from './entities/activity.entity';
import { FlashSale } from './entities/flash-sale.entity';
import { DiscountRule } from './entities/discount-rule.entity';
import { Invitation } from './entities/invitation.entity';
import { Order } from '../order/entities/order.entity';
import { User } from '../user/entities/user.entity';
import { CouponModule } from '../coupon/coupon.module';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Activity,
      FlashSale,
      DiscountRule,
      Invitation,
      Order,
      User,
    ]),
    CouponModule,
    RedisModule,
  ],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}