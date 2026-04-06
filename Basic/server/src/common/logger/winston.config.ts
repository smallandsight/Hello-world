/**
 * Winston 日志配置
 * 
 * 特性：
 * - 控制台输出（带颜色，开发环境友好）
 * - 文件轮转（按日期自动分割，避免单个文件过大）
 * - 按级别分离文件（error单独记录）
 * - JSON格式输出（生产环境便于日志分析平台采集）
 * 
 * 使用方式：
 *   import { Logger } from '@nestjs/common';
 *   // NestJS内置Logger会自动被Winston替换（通过main.ts配置）
 */
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/** 日志目录 */
const LOG_DIR = process.env.LOG_DIR || 'logs';

/** 根据环境决定日志格式 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * 控制台输出格式（开发环境：彩色 + 时间戳）
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
    const ctx = context ? `[${context}]` : '';
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    const traceStr ?= trace ? `\n${trace}` : '';
    return `${timestamp} ${level} ${ctx} ${message}${metaStr}${traceStr}`;
  }),
);

/**
 * 文件输出格式（生产环境：JSON结构化日志）
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  isProduction
    ? winston.format.json()
    : winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
        const ctx = context || 'App';
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}] [${ctx}] ${message}${metaStr}${trace ? ` ${trace}` : ''}`;
      }),
);

/** 控制台Transport */
const consoleTransport = new winston.transports.Console({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: consoleFormat,
});

/** 所有级别日志的每日轮转文件 */
const combinedFileTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: 'application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',          // 单文件最大20MB
  maxFiles: '30d',         // 保留30天
  level: 'debug',
  format: fileFormat,
});

/** 仅ERROR级别的日志文件（便于快速排查问题） */
const errorFileTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '10m',
  maxFiles: '60d',         // 错误日志保留60天
  level: 'error',
  format: fileFormat,
});

/**
 * 导出 Winston Logger 实例
 * 在 main.ts 中使用：
 *   app.useLogger(winston.config.logger);
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  levels: winston.config.npm.levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
  ),
  defaultMeta: {
    service: 'gy-bike-server',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    consoleTransport,
    combinedFileTransport,
    errorFileTransport,
  ],
  // 生产环境不崩溃
  exitOnError: false,
  // 处理未捕获异常和Promise拒绝
  exceptionHandlers: [
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '30d',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '30d',
    }),
  ],
});

// 开发环境下如果日志目录不存在，提示用户
if (!isProduction) {
  console.log(`[Winston] 日志目录: ${LOG_DIR}/`);
  console.log(`[Winston] 日志级别: ${process.env.LOG_LEVEL || 'debug'}`);
}
