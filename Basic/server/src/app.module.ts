/**
 * 应用根模块
 * 导入全局配置、公共基础设施和所有业务 FeatureModule
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// 公共基础设施
import { CommonModule } from './common/common.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { QueryExceptionFilter } from './common/filters/query-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// 业务模块
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { VehicleModule } from './modules/vehicle/vehicle.module';
import { OrderModule } from './modules/order/order.module';
import { PaymentModule } from './modules/payment/payment.module';
import { CouponModule } from './modules/coupon/coupon.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { StaffModule } from './modules/staff/staff.module';
import { MessageModule } from './modules/message/message.module';

@Module({
  imports: [
    // 全局配置（读取 .env）
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      expandVariables: true,
    }),

    // 公共模块（含 Redis 封装）
    CommonModule,

    // 数据库配置
    import('./config/config.module').then((m) => m.AppConfigModule),

    // ========== 业务 FeatureModule ==========
    AuthModule,
    UserModule,
    VehicleModule,
    OrderModule,
    PaymentModule,
    CouponModule,
    TicketModule,
    StaffModule,
    MessageModule,
  ],

  controllers: [AppController],
  providers: [
    AppService,

    // 全局响应拦截器（自动包装为 {code, message, data, timestamp}）
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },

    // 全局日志拦截器
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },

    // 全局 HTTP 异常过滤器
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: QueryExceptionFilter },
  ],
})
export class AppModule {}
