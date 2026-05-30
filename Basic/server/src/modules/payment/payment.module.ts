import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { PreAuth } from './entities/preauth.entity';
import { Order } from '../order/entities/order.entity';
import { ThirdPartyModule } from '../third-party/third-party.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Refund, PreAuth, Order]),
    ThirdPartyModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
