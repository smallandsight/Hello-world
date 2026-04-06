import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { Store } from './entities/store.entity';
import { Vehicle } from '../vehicle/entities/vehicle.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Store, Vehicle]),
  ],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
