/**
 * 阿里云短信服务 (SMS) - 对接阿里云 DysmsAPI
 * 
 * 功能：
 * 1. 发送短信验证码（登录/注册/绑定）
 * 2. 发送通知类短信（订单状态/取车提醒等）
 * 3. 验证码校验与频率限制（基于Redis）
 * 
 * 文档：https://help.aliyun.com/document_detail/55499.html
 */
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../shared/services/redis.service';

/** 短信模板Code枚举 - 需要在阿里云控制台申请并审核通过 */
export enum SmsTemplate {
  /** 登录/注册验证码 SMS_XXXXXX */
  VERIFY_CODE = 'SMS_VERIFY_CODE',
  /** 订单创建通知 SMS_XXXXXX */
  ORDER_CREATED = 'SMS_ORDER_CREATED',
  /** 取车提醒 SMS_XXXXXX */
  PICKUP_REMINDER = 'SMS_PICKUP_REMINDER',
  /** 还车提醒 SMS_XXXXXX */
  RETURN_REMINDER = 'SMS_RETURN_REMINDER',
  /** 支付成功通知 SMS_XXXXXX */
  PAYMENT_SUCCESS = 'SMS_PAYMENT_SUCCESS',
  /** 退款通知 SMS_XXXXXX */
  REFUND_NOTICE = 'SMS_REFUND_NOTICE',
}

export interface SmsConfig {
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;        // 短信签名
  endpoint?: string;       // API地址
}

/** 短信发送结果 */
export interface SmsSendResult {
  success: boolean;
  requestId: string;
  bizId?: string;          // 发送回执ID（用于查询发送状态）
  code?: string;           // 错误码
  message?: string;        // 错误信息
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: any = null; // @alicloud/dysmsapi20170525 Client
  private config: SmsConfig;

  constructor(private readonly redisService: RedisService) {
    this.config = {
      accessKeyId: process.env.ALIYUN_SMS_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || '',
      signName: process.env.ALIYUN_SMS_SIGN_NAME || '古月租车',
      endpoint: process.env.ALIYUN_SMS_ENDPOINT || 'dysmsapi.aliyuncs.com',
    };

    this.initClient();
  }

  /** 初始化短信客户端 */
  private async initClient(): Promise<void> {
    if (!this.config.accessKeyId || !this.config.accessKeySecret) {
      this.logger.warn('[Sms] 缺少阿里云短信配置，短信服务将不可用');
      return;
    }

    try {
      // 动态导入避免缺少依赖时报错
      const dysms = await import('@alicloud/dysmsapi20170525');
      const openapi = await import('@alicloud/openapi-client');

      const config = new openapi.Config({
        accessKeyId: this.config.accessKeyId,
        accessKeySecret: this.config.accessKeySecret,
        endpoint: this.config.endpoint,
      });

      this.client = new dysmsClient.default(config);
      this.logger.log(`[Sms] 短信客户端初始化成功 signName=${this.config.signName}`);
    } catch (e) {
      this.logger.error(`[Sms] 短信客户端初始化失败: ${e.message}`);
      this.client = null;
    }
  }

  get isEnabled(): boolean {
    return this.client !== null && !!this.config.accessKeyId;
  }

  // ==================== 验证码相关 ====================

  /**
   * 发送短信验证码
   * 流程：频率检查 → 生成验证码 → 存Redis → 调用阿里云API → 返回结果
   * 
   * @param phone - 手机号
   * @param purpose - 用途：login/register/bind/password/reset
   * @returns 发送结果（注意：不返回验证码本身）
   */
  async sendVerifyCode(phone: string, purpose: string = 'login'): Promise<SmsSendResult> {
    // 1. 手机号格式校验
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return {
        success: false,
        requestId: '',
        code: 'INVALID_PHONE',
        message: '手机号格式不正确',
      };
    }

    // 2. 频率限制检查
    const freqCheck = await this.checkFrequency(phone);
    if (!freqCheck.allowed) {
      return {
        success: false,
        requestId: '',
        code: 'FREQUENCY_LIMITED',
        message: freqCheck.reason || '操作过于频繁，请稍后再试',
      };
    }

    // 3. 生成6位随机验证码
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // 4. 存储到Redis（5分钟过期）
    const cacheKey = `sms:code:${phone}:${purpose}`;
    await this.redisService.setex(cacheKey, 300, code); // 5分钟有效

    // 5. 记录发送次数（用于每日限额统计）
    const countKey = `sms:daily:${phone}:${this.getTodayStr()`;
    await this.redisService.incr(countKey);
    await this.redisService.expire(countKey, 86400);

    // 6. 如果没有配置真实短信，开发环境直接记录日志
    if (!this.isEnabled) {
      this.logger.log(`[Sms-DevMode] 发送验证码至 ${phone}: ${code} (purpose=${purpose})`);
      return {
        success: true,
        requestId: 'dev-mode',
        bizId: `dev-${Date.now()}`,
        code: 'DEV_MODE',
        message: '开发模式，未实际发送短信',
      };
    }

    // 7. 调用阿里云短信API
    try {
      return await this.sendSms({
        phone,
        templateCode: this.resolveTemplate(SmsTemplate.VERIFY_CODE),
        templateParam: JSON.stringify({ code }),
      });
    } catch (error) {
      this.logger.error(`[Sms] 发送验证码失败 ${phone}: ${error.message}`);
      return {
        success: false,
        requestId: '',
        code: 'SEND_FAILED',
        message: error.message,
      };
    }
  }

  /**
   * 校验验证码
   * @returns 是否正确
   */
  async verifyCode(
    phone: string,
    code: string,
    purpose: string = 'login',
  ): Promise<{ valid: boolean; reason?: string }> {
    if (!code || code.length !== 6) {
      return { valid: false, reason: '验证码格式错误' };
    }

    const cacheKey = `sms:code:${phone}:${purpose}`;
    const cached = await this.redisService.get(cacheKey);

    if (!cached) {
      return { valid: false, reason: '验证码已过期或不存在' };
    }

    // 验证后立即删除（一次性使用）
    if (cached === code) {
      await this.redisService.del(cacheKey);
      return { valid: true };
    }

    return { valid: false, reason: '验证码错误' };
  }

  /**
   * 检查发送频率限制
   * 规则：
   * - 同一手机号同一用途 60s 内不能重发
   * - 同一手机号每日最多 10 条
   * - 同一IP 每小时最多 20 条
   */
  private async checkFrequency(
    phone: string,
    ip?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // 同一号码60秒冷却
    const cooldownKey = `sms:cooldown:${phone}`;
    const cooldown = await this.redisService.ttl(cooldownKey);
    if (cooldown > 0) {
      return { allowed: false, reason: `${cooldown}秒后再试` };
    }

    // 每日限额10条
    const dailyCountStr = await this.redisService.get(`sms:daily:${phone}:${this.getTodayStr()}`);
    const dailyCount = parseInt(dailyCountStr || '0', 10);
    if (dailyCount >= 10) {
      return { allowed: false, reason: '今日短信次数已用完' };
    }

    // 设置60秒冷却
    await this.redisService.setex(cooldownKey, 60, '1');

    return { allowed: true };
  }

  // ==================== 通知类短信 ====================

  /**
   * 发送订单创建通知
   */
  async sendOrderNotice(phone: string, params: {
    orderNo: string;
    vehicleName: string;
    pickupTime: string;
    storeName: string;
  }): Promise<SmsSendResult> {
    if (!this.isEnabled) {
      this.logger.log(`[Sms-DevMode] 订单通知 ${phone}: ${JSON.stringify(params)}`);
      return { success: true, requestId: 'dev-mode', message: '开发模式' };
    }

    return this.sendSms({
      phone,
      templateCode: this.resolveTemplate(SmsTemplate.ORDER_CREATED),
      templateParam: JSON.stringify(params),
    });
  }

  /**
   * 发送支付成功通知
   */
  async sendPaymentNotice(phone: string, params: {
    orderNo: string;
    amount: string;
    payTime: string;
  }): Promise<SmsSendResult> {
    if (!this.isEnabled) {
      this.logger.log(`[Sms-DevMode] 支付通知 ${phone}: ${JSON.stringify(params)}`);
      return { success: true, requestId: 'dev-mode', message: '开发模式' };
    }

    return this.sendSms({
      phone,
      templateCode: this.resolveTemplate(SmsTemplate.PAYMENT_SUCCESS),
      templateParam: JSON.stringify(params),
    });
  }

  /**
   * 发送退款通知
   */
  async sendRefundNotice(phone: string, params: {
    orderNo: string;
    refundAmount: string;
    arriveTime?: string;
  }): Promise<SmsSendResult> {
    if (!this.isEnabled) {
      this.logger.log(`[Sms-DevMode] 退款通知 ${phone}: ${JSON.stringify(params)}`);
      return { success: true, requestId: 'dev-mode', message: '开发模式' };
    }

    return this.sendSms({
      phone,
      templateCode: this.resolveTemplate(SmsTemplate.REFUND_NOTICE),
      templateParam: JSON.stringify(params),
    });
  }

  /**
   * 发送自定义模板短信
   */
  async sendCustomSms(
    phone: string,
    templateCode: string,
    templateParam: Record<string, string>,
  ): Promise<SmsSendResult> {
    return this.sendSms({
      phone,
      templateCode,
      templateParam: JSON.stringify(templateParam),
    });
  }

  // ==================== 底层方法 ====================

  /**
   * 调用阿里云短信发送API
   */
  private async sendSms(params: {
    phone: string;
    templateCode: string;
    templateParam: string;
  }): Promise<SmsSendResult> {
    if (!this.client) {
      throw new Error('短信客户端未初始化');
    }

    try {
      const result = await this.client.sendSms({
        phoneNumbers: params.phone,
        signName: this.config.signName,
        templateCode: params.templateCode,
        templateParam: params.templateParam,
      });

      const body = result.body;
      if (body.code === 'OK') {
        return {
          success: true,
          requestId: body.requestId,
          bizId: body.bizId,
        };
      }

      this.logger.error(`[Sms] API返回错误: ${body.code} - ${body.message}`);
      return {
        success: false,
        requestId: body.requestId,
        code: body.code,
        message: body.message,
      };
    } catch (error) {
      this.logger.error(`[Sms] 发送异常 ${params.phone}: ${error.message}`);
      return {
        success: false,
        requestId: '',
        code: 'EXCEPTION',
        message: error.message,
      };
    }
  }

  /** 解析模板Code（从env读取实际值） */
  private resolveTemplate(template: SmsTemplate): string {
    const envMap: Record<string, string> = {
      [SmsTemplate.VERIFY_CODE]: 'ALIPAY_SMS_TEMPLATE_VERIFY_CODE',
      [SmsTemplate.ORDER_CREATED]: 'ALIPAY_SMS_TEMPLATE_ORDER_CREATED',
      [SmsTemplate.PICKUP_REMINDER]: 'ALIPAY_SMS_TEMPLATE_PICKUP_REMINDER',
      [SmsTemplate.RETURN_REMINDER]: 'ALIPAY_SMS_TEMPLATE_RETURN_REMINDER',
      [SmsTemplate.PAYMENT_SUCCESS]: 'ALIPAY_SMS_TEMPLATE_PAYMENT_SUCCESS',
      [SmsTemplate.REFUND_NOTICE]: 'ALIPAY_SMS_TEMPLATE_REFUND_NOTICE',
    };

    return process.env[envMap[template]] || template;
  }

  /** 获取今天的日期字符串 YYYYMMDD */
  private getTodayStr(): string {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  }
}
