import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RenewalController } from './renewal.controller';
import { RenewalService } from './renewal.service';
import { Renewal } from './entities/renewal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Renewal])],
  controllers: [RenewalController],
  providers: [RenewalService],
  exports: [RenewalService],
})
export class RenewalModule {}
