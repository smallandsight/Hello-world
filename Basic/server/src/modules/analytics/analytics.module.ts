import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { EtlService } from './etl.service';
import { AnalyticsCron } from './analytics.cron';
import { AnalyticsDaily } from './entities/analytics-daily.entity';
import { AnalyticsWeekly } from './entities/analytics-weekly.entity';
import { AnalyticsMonthly } from './entities/analytics-monthly.entity';
import { Order } from '../order/entities/order.entity';
import { User } from '../user/entities/user.entity';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { Payment } from '../payment/entities/payment.entity';
import { Ticket } from '../ticket/entities/ticket.entity';
import { UserCoupon } from '../coupon/entities/user-coupon.entity';
import { PointsRecord } from '../coupon/entities/points-record.entity';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalyticsDaily,
      AnalyticsWeekly,
      AnalyticsMonthly,
      Order,
      User,
      Vehicle,
      Payment,
      Ticket,
      UserCoupon,
      PointsRecord,
    ]),
    ScheduleModule.forRoot(),
    RedisModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, EtlService, AnalyticsCron],
  exports: [AnalyticsService, EtlService],
})
export class AnalyticsModule {}