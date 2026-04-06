import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationController } from './operation.controller';
import { OperationService } from './operation.service';
import { ExceptionLog } from './entities/exception-log.entity';
import { VehicleTransfer } from './entities/vehicle-transfer.entity';
import { MessageTemplate } from './entities/message-template.entity';
import { Order } from '../order/entities/order.entity';
import { Vehicle } from '../vehicle/entities/vehicle.entity';
import { Store } from '../store/entities/store.entity';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExceptionLog,
      VehicleTransfer,
      MessageTemplate,
      Order,
      Vehicle,
      Store,
    ]),
    RedisModule,
  ],
  controllers: [OperationController],
  providers: [OperationService],
  exports: [OperationService],
})
export class OperationModule {}