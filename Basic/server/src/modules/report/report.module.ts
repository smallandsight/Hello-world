import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { Order } from '../order/entities/order.entity';
import { Payment } from '../payment/entities/payment.entity';
import { User } from '../user/entities/user.entity';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { Store } from '../store/entities/store.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { Refund } from '../payment/entities/refund.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { AnalyticsDaily } from '../analytics/entities/analytics-daily.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Payment,
      User,
      Vehicle,
      Store,
      Invoice,
      Refund,
      WalletTransaction,
      AnalyticsDaily,
    ]),
  ],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}