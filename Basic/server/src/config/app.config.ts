/**
 * 应用级配置常量
 * 集中管理端口、CORS、JWT、支付等业务配置项
 */
export class AppConfig {
  /** 应用端口 */
  static get port(): number {
    return parseInt(process.env.APP_PORT || '3000', 10);
  }

  /** API 前缀 */
  static get apiPrefix(): string {
    return process.env.API_PREFIX || '/v1';
  }

  /** 应用名称 */
  static get appName(): string {
    return process.env.APP_NAME || 'gy-bike-server';
  }

  /** JWT 配置 */
  static get jwt() {
    return {
      secret: process.env.JWT_SECRET || 'default-secret-change-me',
      userExpiresIn: process.env.JWT_USER_EXPIRES_IN || '7d',
      staffExpiresIn: process.env.JWT_STAFF_EXPIRES_IN || '2d',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      issuer: process.env.JWT_ISSUER || 'gy-bike-api',
    };
  }

  /** 支付宝小程序配置 */
  static get alipay() {
    return {
      appId: process.env.ALIPAY_APP_ID || '',
      privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
      publicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    };
  }

  /** 是否为生产环境 */
  static get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /** 日志级别 */
  static get logLevel(): string {
    return process.env.LOG_LEVEL || 'debug';
  }
}
