import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';
import { Vehicle } from './entities/vehicle.entity';
import { Store } from './entities/store.entity';
import { VehicleModel } from './entities/vehicle-model.entity';
import { VehicleImage } from './entities/vehicle-image.entity';
import { VehicleMaintenance } from './entities/vehicle-maintenance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vehicle,
      Store,
      VehicleModel,
      VehicleImage,
      VehicleMaintenance,
    ]),
  ],
  controllers: [VehicleController],
  providers: [VehicleService],
  exports: [VehicleService],
})
export class VehicleModule {}
