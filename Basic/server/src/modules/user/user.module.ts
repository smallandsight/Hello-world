import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { DriverLicense } from './entities/driver-license.entity';
import { UserLevel } from './entities/user-level.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, DriverLicense, UserLevel])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
