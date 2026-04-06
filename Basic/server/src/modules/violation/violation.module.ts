import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ViolationController } from './violation.controller';
import { ViolationService } from './violation.service';
import { ViolationDeposit } from './entities/violation-deposit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ViolationDeposit])],
  controllers: [ViolationController],
  providers: [ViolationService],
  exports: [ViolationService],
})
export class ViolationModule {}
