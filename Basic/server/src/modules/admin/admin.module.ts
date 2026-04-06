import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { VehicleModel } from '../vehicle/entities/vehicle-model.entity';
import { Store } from '../vehicle/entities/store.entity';
import { Order } from '../order/entities/order.entity';
import { Payment } from '../payment/entities/payment.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vehicle,
      VehicleModel,
      Store,
      Order,
      Payment,
      User,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
