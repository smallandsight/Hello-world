/**
 * NestJS 应用入口文件
 * 负责创建 NestApplication 实例、注册全局中间件、启动 HTTP 监听
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // --- 安全中间件 ---
  app.use(helmet());
  app.use(compression());

  // --- 全局前缀 ---
  const apiPrefix = process.env.API_PREFIX || '/v1';
  app.setGlobalPrefix(apiPrefix);

  // --- CORS 跨域配置 ---
  const corsOrigins = (process.env.CORS_ORIGINS || '*').split(',');
  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // --- 全局验证管道 ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // 剥离未定义的属性
      forbidNonWhitelisted: true, // 拒绝未定义属性（开发阶段开启）
      transform: true,           // 自动类型转换
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // --- Swagger API 文档 ---
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle(process.env.SWAGGER_TITLE || '古月租车 API')
      .setDescription(
        process.env.SWAGGER_DESCRIPTION || '古月租车小程序后端接口文档',
      )
      .setVersion(process.env.SWAGGER_VERSION || '1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '输入JWT Token',
        },
        'access-token',
      )
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '商家端 JWT Token',
        },
        'staff-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
    logger.log(`Swagger 文档已启用: http://localhost:${process.env.APP_PORT || 3000}/${apiPrefix}/docs`);
  }

  // --- 启动监听 ---
  const port = parseInt(process.env.APP_PORT || '3000', 10);
  await app.listen(port);

  logger.log(`🚀 应用启动成功: http://localhost:${port}/${apiPrefix}`);
  logger.log(`环境: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch((err) => {
  console.error('应用启动失败:', err);
  process.exit(1);
});
