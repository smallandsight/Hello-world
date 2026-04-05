/**
 * 认证模块
 * 负责用户/商家的登录、JWT签发、Token刷新和登出
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    // Passport 认证策略
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT 模块配置
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'default-secret'),
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_USER_EXPIRES_IN',
            '7d',
          ),
          issuer: configService.get<string>('JWT_ISSUER', 'gy-bike-api'),
        },
      }),
    }),

    // TODO: 注入 UserModule / StaffModule（用于查询用户）
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
