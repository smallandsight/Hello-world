import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { PointsController } from './points.controller';
import { PointsService } from './points.service';
import { Coupon } from './entities/coupon.entity';
import { UserCoupon } from './entities/user-coupon.entity';
import { PointsRecord } from './entities/points-record.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Coupon, UserCoupon, PointsRecord, User])],
  controllers: [CouponController, PointsController],
  providers: [CouponService, PointsService],
  exports: [CouponService, PointsService],
})
export class CouponModule {}
