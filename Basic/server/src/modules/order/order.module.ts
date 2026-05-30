import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order } from './entities/order.entity';
import { OrderLog } from './entities/order-log.entity';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { VehicleModel } from '../vehicle/entities/vehicle-model.entity';
import { Store } from '../vehicle/entities/store.entity';
import { UserCoupon } from '../coupon/entities/user-coupon.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderLog, Vehicle, VehicleModel, Store, UserCoupon])],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
