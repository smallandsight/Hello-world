import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * 安全响应头中间件 (T3W14-3)
 *
 * 自动添加以下安全头：
 * - Strict-Transport-Security: 强制HTTPS
 * - X-Frame-Options: 防止点击劫持
 * - X-Content-Type-Options: 防止MIME嗅探
 * - X-XSS-Protection: XSS过滤器
 * - Content-Security-Policy: 内容安全策略
 * - Referrer-Policy: 引用策略
 * - Permissions-Policy: 权限策略
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly logger = new Logger('SecurityHeaders');

  use(req: Request, res: Response, next: NextFunction) {
    // HSTS — 严格传输安全（生产环境强制HTTPS一年）
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    );

    // 防止页面被嵌入 iframe（防止点击劫持）
    res.setHeader('X-Frame-Options', 'DENY');

    // 禁止浏览器猜测内容类型
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS 保护
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // 引用策略 — 不发送完整引用信息
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 权限策略 — 禁用不必要的浏览器API
    res.setHeader(
      'Permissions-Policy',
      [
        'camera=()',
        'microphone=()',
        'geolocation=(self)',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
      ].join(', '),
    );

    // Content Security Policy — 基础策略
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // 开发阶段需要unsafe-inline，生产环境建议使用nonce/hash
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:", // 允许加载外部图片(如OSS/CDN)
        "font-src 'self'",
        "connect-src 'self' https://*.alipay.com", // 支付宝回调等
        "frame-ancestors 'none'",
        "form-action 'self'",
        "base-uri 'self'",
      ].join('; '),
    );

    // 移除暴露服务器信息的头（如果存在）
    res.removeHeader('X-Powered-By');

    next();
  }
}
