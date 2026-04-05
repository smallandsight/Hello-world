import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';
import { PreAuth } from './entities/preauth.entity';
import { Refund } from './entities/refund.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, PreAuth, Refund])],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
