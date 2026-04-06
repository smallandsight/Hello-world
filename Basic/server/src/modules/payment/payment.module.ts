import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { PreAuth } from './entities/preauth.entity';
// 引入支付宝服务用于真实支付对接
import { ThirdPartyModule } from '../third-party/third-party.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Refund, PreAuth]),
    ThirdPartyModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
