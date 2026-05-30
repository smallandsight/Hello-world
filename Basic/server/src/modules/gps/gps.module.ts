import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GpsController } from './gps.controller';
import { GpsTrackService } from './gps-track.service';
import { GpsPoint } from './gps-point.entity';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GpsPoint]),
    CommonModule,
  ],
  controllers: [GpsController],
  providers: [GpsTrackService],
  exports: [GpsTrackService],
})
export class GpsModule {}
