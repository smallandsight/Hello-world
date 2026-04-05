/**
 * TypeORM 数据库配置（MySQL 8.0）
 * 从 .env 读取连接参数，提供 TypeORM Module 所需的异步配置
 */
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const DatabaseConfig = TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'mysql',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 3306),
    username: configService.get<string>('DB_USERNAME', 'root'),
    password: configService.get<string>('DB_PASSWORD', ''),
    database: configService.get<string>('DB_DATABASE', 'gy_bike'),
    charset: configService.get<string>('DB_CHARSET', 'utf8mb4'),
    timezone: configService.get<string>('DB_TIMEZONE', '+08:00'),
    synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
    logging: configService.get<boolean>('DB_LOGGING', true),

    // Entity 扫描路径
    entities: [configService.get<string>('DB_ENTITIES', '**/*.entity.{ts,js}')],

    // 迁移配置
    migrations: [
      configService.get<string>(
        'DB_MIGRATIONS',
        'src/database/migrations/*.{ts,js}',
      ),
    ],
    migrationsRun: configService.get<boolean>('DB_MIGRATIONS_RUN', false),

    // 连接池
    extra: {
      connectionLimit: 10,
      acquireTimeout: 60000,
      waitForConnections: true,
      connectTimeout: 10000,
    },
  }),
});
