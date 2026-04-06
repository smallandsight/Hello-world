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
import { OrderModule } from '../order/order.module';
import { UserModule } from '../user/user.module';
import { VehicleModule } from '../vehicle/vehicle.module';
import { PaymentModule } from '../payment/payment.module';
import { TicketModule } from '../ticket/ticket.module';
import { CouponModule } from '../coupon/coupon.module';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalyticsDaily,
      AnalyticsWeekly,
      AnalyticsMonthly,
    ]),
    ScheduleModule.forRoot(),
    OrderModule,
    UserModule,
    VehicleModule,
    PaymentModule,
    TicketModule,
    CouponModule,
    RedisModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, EtlService, AnalyticsCron],
  exports: [AnalyticsService, EtlService],
})
export class AnalyticsModule {}