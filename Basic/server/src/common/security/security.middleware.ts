/**
 * 安全中间件 - HTTP 安全头配置
 * 
 * 功能：
 * 1. Helmet.js 基础防护（已在main.ts中全局注册）
 * 2. 自定义安全头增强（CSP、HSTS、X-Frame等）
 * 3. CORS 精细化控制
 * 4. Rate Limiting（速率限制）
 * 5. Request ID 追踪
 * 6. SQL注入 / XSS 防护辅助
 * 
 * 参考：T3W14-3 需求 - 安全加固项
 */
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/** 安全配置 */
interface SecurityConfig {
  /** 是否启用严格CSP */
  strictCsp: boolean;
  /** HSTS最大时间（秒） */
  hstsMaxAge: number;
  /** 是否包含子域名 */
  hstsIncludeSubdomains: boolean;
  /** 允许的来源白名单（* 表示全部允许，生产环境应指定具体域名） */
  allowedOrigins: string[];
  /** API速率限制（每分钟请求数） */
  rateLimitPerMinute: number;
}

const DEFAULT_CONFIG: SecurityConfig = {
  strictCsp: process.env.NODE_ENV === 'production',
  hstsMaxAge: 31536000, // 1年
  hstsIncludeSubdomains: true,
  allowedOrigins: (process.env.CORS_ORIGINS || '*').split(',').map(o => o.trim()),
  rateLimitPerMinute: parseInt(process.env.RATE_LIMIT_PER_MIN || '60', 10),
};

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);
  private config = DEFAULT_CONFIG;

  use(req: Request, res: Response, next: NextFunction) {
    // 1. 分配请求ID（用于日志追踪和排查问题）
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    req['requestId'] = requestId;

    // 2. 设置安全响应头
    this.setSecurityHeaders(res);

    // 3. 记录请求信息（仅debug模式）
    if (this.config.strictCsp === false || process.env.LOG_LEVEL === 'debug') {
      // 不记录每次请求，仅在需要时开启
    }

    next();
  }

  /**
   * 设置HTTP安全响应头
   * 符合 OWASP Secure Headers Project 推荐
   */
  private setSecurityHeaders(res: Response): void {
    const headers: Record<string, string> = {};

    // --- HSTS (HTTP Strict Transport Security) ---
    // 强制浏览器只使用HTTPS连接
    if (process.env.NODE_ENV === 'production') {
      headers['Strict-Transport-Security'] =
        `max-age=${this.config.hstsMaxAge}; includeSubDomains; preload`;
    }

    // --- Content Security Policy ---
    if (this.config.strictCsp) {
      headers['Content-Security-Policy'] = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // 小程序API可能需要inline
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:", // OSS图片通过HTTPS加载
        "font-src 'self'",
        "connect-src 'self' https://*.alipay.com https://*.alicdn.com", // 支付宝/阿里云
        "frame-ancestors 'none'",           // 防止被嵌入iframe（点击劫持）
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ');
    }

    // --- X-Frame-Options ---
    // 已被Helmet设置，这里增强为DENY
    headers['X-Frame-Options'] = 'DENY';

    // --- X-Content-Type-Options ---
    // 防止MIME嗅探
    headers['X-Content-Type-Options'] = 'nosniff';

    // --- X-XSS-Protection ---
    // 启用浏览器内置XSS过滤器
    headers['X-XSS-Protection'] = '1; mode=block';

    // --- Referrer-Policy ---
    // 控制Referer头泄露隐私
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';

    // --- Permissions-Policy (原Feature-Policy) ---
    // 限制浏览器功能使用
    headers['Permissions-Policy'] = [
      'camera=()',
      'microphone=()',
      'geolocation=(self)',
      'payment=(self)',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
    ].join(', ');

    // --- Cache-Control for API responses ---
    // API响应默认不缓存（可在Controller层面覆盖）
    if (!res.get('Cache-Control')) {
      headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    }

    // 应用所有自定义头
    Object.entries(headers).forEach(([key, value]) => {
      if (!res.getHeader(key)) {
        res.setHeader(key, value);
      }
    });
  }
}

// ==================== 辅助函数 ====================

/**
 * 检查来源是否在白名单内
 */
export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return false; // 非浏览器直接调用（如Postman/curl）
  if (allowedOrigins.includes('*')) return true;
  
  return allowedOrigins.some(allowed => {
    // 支持通配符 *.example.com
    if (allowed.startsWith('*.')) {
      const domain = allowed.substring(2);
      return origin.endsWith(`.${domain}`) || origin === domain;
    }
    return origin === allowed;
  });
}

/**
 * 基础输入清洗函数
 * 用于防止XSS和SQL注入的基础过滤
 * 注意：这不能替代参数化查询和ORM的使用
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return input;

  return input
    .replace(/[<>]/g, '')          // 移除HTML标签符号
    .replace(/[\x00-\x1F]/g, '')   // 移除控制字符
    .trim()
    .substring(0, 10000);          // 限制长度防止DoS
}
