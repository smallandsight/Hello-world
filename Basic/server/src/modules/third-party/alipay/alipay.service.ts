/**
 * 支付宝服务 - 完整对接支付宝开放平台 API
 * 
 * 功能：
 * 1. 小程序授权登录（auth.token 换取用户信息）
 * 2. 手机号授权解密
 * 3. 芝麻信用分查询（预授权/信用评估）
 * 4. 支付能力（下单、退款、查单、关单）
 * 5. 签名验证（回调验签）
 * 
 * 文档：https://opendocs.alipay.com/
 */
import { Injectable, Logger } from '@nestjs/common';
import * as AlipaySdk from 'alipay-sdk';

export interface AlipayConfig {
  /** 应用APPID */
  appId: string;
  /** 应用私钥（PKCS1格式） */
  privateKey: string;
  /** 支付宝公钥（非应用公钥，用于验签） */
  alipayPublicKey: string;
  /** 网关地址 */
  gateway?: string;
  /** 是否沙箱环境 */
  sandbox?: boolean;
  /** 回调通知URL前缀 */
  notifyUrl?: string;
}

/** 支付宝用户信息（从auth.token获取） */
export interface AlipayUserInfo {
  userId: string;
  avatar: string;
  nickName: string;
  isCertified: boolean;   // 是否实名认证
  gender: 'm' | 'f' | 'unknown';
  province?: string;
  city?: string;
}

/** 支付下单结果 */
export interface AlipayTradeResult {
  tradeNo: string;        // 支付宝交易号
  outTradeNo: string;     // 商户订单号
  payParams: Record<string, any>; // 小程序调起支付的参数
}

/** 退款结果 */
export interface AlipayRefundResult {
  tradeNo: string;
  refundAmount: string;
  status: string;
}

@Injectable()
export class AlipayService {
  private readonly logger = new Logger(AlipayService.name);
  private sdk: AlipaySdk.default | null = null;
  private config: AlipayConfig;

  constructor() {
    this.config = {
      appId: process.env.ALIPAY_APP_ID || '',
      privateKey: (process.env.ALIPAY_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      alipayPublicKey: (process.env.ALIPAY_PUBLIC_KEY || '').replace(/\\n/g, '\n'),
      gateway: process.env.ALIPAY_GATEWAY || (
        process.env.ALIPAY_SANDBOX === 'true'
          ? 'https://openapi-sandbox.dl.alipaydev.com/gateway.do'
          : 'https://openapi.alipay.com/gateway.do'
      ),
      sandbox: process.env.ALIPAY_SANDBOX === 'true',
      notifyUrl: process.env.ALIPAY_NOTIFY_URL,
    };

    this.initSdk();
  }

  /** 初始化SDK实例 */
  private initSdk(): void {
    if (!this.config.appId || !this.config.privateKey) {
      this.logger.warn('[Alipay] 缺少必要配置(APP_ID/PRIVATE_KEY)，支付宝服务将不可用');
      return;
    }

    try {
      this.sdk = new AlipaySdk.default({
        appId: this.config.appId,
        privateKey: this.config.privateKey,
        alipayPublicKey: this.config.alipayPublicKey || undefined,
        signType: 'RSA2' as const,
        charset: 'utf-8' as const,
        version: '1.0' as const,
        gateway: this.config.gateway!,
      });
      this.logger.log(`[Alipay] SDK初始化成功 appId=${this.config.appId} sandbox=${this.config.sandbox}`);
    } catch (e) {
      this.logger.error(`[Alipay] SDK初始化失败: ${e.message}`);
    }
  }

  /** 检查SDK是否可用 */
  get isEnabled(): boolean {
    return this.sdk !== null && !!this.config.appId;
  }

  // ==================== 登录相关 ====================

  /**
   * 使用授权码换取用户信息（小程序登录）
   * 对应API：alipay.system.oauth.token
   * 
   * @param authCode - 前端通过 my.getAuthCode() 获取的授权码
   * @returns 支付宝用户信息
   */
  async getUserByAuthCode(authCode: string): Promise<AlipayUserInfo> {
    if (!this.sdk) throw new Error('支付宝服务未正确初始化');

    try {
      const result = await this.sdk!.exec('alipay.system.oauth.token', {
        grantType: 'authorization_code',
        code: authCode,
      });

      const response = result as any;

      // 错误处理
      if (response.code !== '10000') {
        throw new Error(`支付宝授权失败: ${response.msg} (${response.sub_msg || ''})`);
      }

      const accessToken = response.access_token;

      // 用accessToken获取用户信息
      const userInfo = await this.sdk!.exec('alipay.user.info.share', {
        authToken: accessToken,
      }) as any;

      if (userInfo.code !== '10000') {
        throw new Error(`获取用户信息失败: ${userInfo.msg}`);
      }

      return {
        userId: userInfo.user_id,
        avatar: userInfo.avatar || '',
        nickName: userInfo.nick_name || '支付宝用户',
        isCertified: userInfo.certified === 'true' || userInfo.certified === true,
        gender: userInfo.gender || 'unknown',
        province: userInfo.province,
        city: userInfo.city,
      };
    } catch (error) {
      this.logger.error(`[Alipay] 授权登录失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 解密手机号（需配合前端 my.getPhoneNumber）
   * 对应API：alipay.user.phoneno.get
   * 
   * @param authToken - 用户授权token
   * @returns 用户手机号（明文）
   */
  async decryptPhone(authToken: string): Promise<string> {
    if (!this.sdk) throw new Error('支付宝服务未正确初始化');

    try {
      const result = await this.sdk.exec('alipay.user.phoneno.get', {
        authToken,
      }) as any;

      if (result.code !== '10000') {
        throw new Error(`获取手机号失败: ${result.msg} (${result.sub_msg || ''})`);
      }

      return result.mobile;
    } catch (error) {
      this.logger.error(`[Alipay] 手机号解密失败: ${error.message}`);
      throw error;
    }
  }

  // ==================== 芝麻信用 ====================

  /**
   * 查询芝麻信用分（需要签约芝麻信用产品）
   * 对应API：zhima.credit.score.brief.get
   * 
   * @param alipayUserId - 支付宝userId
   * @param transactionId - 业务流水号（幂等）
   * @returns 芝麻信用分 (350-950)
   */
  async queryCreditScore(
    alipayUserId: string,
    transactionId: string,
  ): Promise<{ score: number; level: string }> {
    if (!this.sdk) throw new Error('支付宝服务未正确初始化');

    try {
      const result = await this.sdk.exec('zhima.credit.score.brief.get', {
        alipay_user_id: alipayUserId,
        transaction_id: transactionId,
      }) as any;

      if (result.code !== '10000') {
        // 芝麻信用可能未授权，返回默认值而非报错
        this.logger.warn(`[Alipay] 芝麻信用分获取失败: ${result.msg}, 使用默认值`);
        return { score: 600, level: 'unknown' };
      }

      const score = parseInt(result.zhimab_score, 10);
      let level: string;
      if (score >= 700) level = 'excellent';
      else if (score >= 650) level = 'good';
      else if (score >= 550) level = 'fair';
      else if (score >= 450) level = 'limited';
      else level = 'poor';

      return { score, level };
    } catch (error) {
      this.logger.error(`[Alipay] 芝麻信用查询异常: ${error.message}`);
      return { score: 0, level: 'error' };
    }
  }

  /**
   * 发起芝麻信用预授权（免押金场景）
   * 对应API：zhima.credit.auth.freeze.create
   * 
   * @param alipayUserId - 支付宝userId
   * @param orderNo - 业务订单号
   * @param amount - 预授权金额（元）
   * @param outRequestNo - 商户请求号（幂等）
   */
  async createCreditFreeze(
    alipayUserId: string,
    orderNo: string,
    amount: number,
    outRequestNo: string,
  ): Promise<{
    success: boolean;
    agreementId?: string;
    preAuthNo?: string;
  }> {
    if (!this.sdk) throw new Error('支付宝服务未正确初始化');

    try {
      const result = await this.sdk.exec('zhima.credit.auth.freeze.create', {
        alipay_user_id: alipayUserId,
        out_order_no: orderNo,
        out_request_no: outRequestNo,
        pay_amount: amount.toFixed(2),
        pay_timeout: '30m',       // 30分钟超时
        extra_param: JSON.stringify({
          category_name: '共享出行-租车',
          category_code: 'bike_rental',
        }),
      }) as any;

      if (result.code === '10000') {
        return {
          success: true,
          agreementId: result.agreement_no,
          preAuthNo: result.pre_auth_no,
        };
      }

      this.logger.warn(`[Alipay] 芝麻预授权创建失败: ${result.msg}(${result.sub_msg})`);
      return { success: false };
    } catch (error) {
      this.logger.error(`[Alipay] 芝麻预授权异常: ${error.message}`);
      return { success: false };
    }
  }

  // ==================== 支付能力 ====================

  /**
   * 创建支付交易（小程序）
   * 对应API：alipay.trade.create
   * 
   * @param params - 支付参数
   * @returns 包含tradeNO的支付参数（供前端调起支付）
   */
  async createTrade(params: {
    outTradeNo: string;
    totalAmount: number;     // 单位：元
    subject: string;          // 订单标题
    body?: string;            // 订单描述
    buyerId?: string;         // 买家的支付宝userId
    timeoutExpress?: string;  // 过期时间，如 "30m"
    extendParams?: Record<string, string>;
  }): Promise<AlipayTradeResult> {
    if (!this.sdk) throw new Error('支付宝服务未正确初始化');

    try {
      const result = await this.sdk.exec('alipay.trade.create', {
        notify_url: `${this.config.notifyUrl}/payment/alipay/callback`,
        bizContent: {
          out_trade_no: params.outTradeNo,
          total_amount: params.totalAmount.toFixed(2),
          subject: params.subject,
          body: params.body || `古月租车-${params.subject`,
          buyer_id: params.buyerId || undefined,
          timeout_express: params.timeoutExpress || '30m',
          extend_params: params.extendParams || undefined,
        },
      }) as any;

      if (result.code !== '10000') {
        throw new Error(`创建支付交易失败: ${result.msg}(${result.sub_msg || ''})`);
      }

      // 返回给小程序的调起参数
      return {
        tradeNo: result.trade_no,
        outTradeNo: params.outTradeNo,
        payParams: {
          tradeNO: result.trade_no,
        },
      };
    } catch (error) {
      this.logger.error(`[Alipay] 创建交易失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 交易关闭（用户取消或超时）
   * 对应API：alipay.trade.close
   */
  async closeTrade(outTradeNo: string): Promise<boolean> {
    if (!this.sdk) return false;

    try {
      const result = await this.sdk.exec('alipay.trade.close', {
        bizContent: {
          out_trade_no: outTradeNo,
        },
      }) as any;

      return result.code === '10000';
    } catch (error) {
      this.logger.error(`[Alipay] 关闭交易失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 查询交易状态（掉单补偿用）
   * 对应API：alipay.trade.query
   */
  async queryTrade(outTradeNo: string): Promise<{
    status: string;
    tradeStatus: string;
    totalAmount: string;
    buyerLogonId?: string;
  }> {
    if (!this.sdk) throw new Error('支付宝服务未正确初始化');

    const result = await this.sdk.exec('alipay.trade.query', {
      bizContent: {
        out_trade_no: outTradeNo,
      },
    }) as any;

    if (result.code !== '10000') {
      throw new Error(`查询交易失败: ${result.msg}`);
    }

    return {
      status: result.code,
      tradeStatus: result.trade_status || '',  // WAIT_BUYER_PAY / TRADE_SUCCESS / TRADE_CLOSED / TRADE_FINISHED
      totalAmount: result.total_amount || '0',
      buyerLogonId: result.buyer_logon_id,
    };
  }

  /**
   * 退款（支持部分退款和多次退款）
   * 对应API：alipay.trade.refund
   */
  async refund(params: {
    outTradeNo: string;         // 原商户订单号
    refundAmount: number;       // 退款金额（元）
    refundReason?: string;      // 退款原因
    outRequestNo: string;       // 退款请求号（幂等）
    tradeNo?: string;           // 支付宝交易号（可选）
  }): Promise<AlipayRefundResult> {
    if (!this.sdk) throw new Error('支付宝服务未正确�置');

    try {
      const result = await this.sdk.exec('alipay.trade.refund', {
        bizContent: {
          out_trade_no: params.outTradeNo,
          trade_no: params.tradeNo || undefined,
          refund_amount: params.refundAmount.toFixed(2),
          refund_reason: params.refundReason || '用户申请退款',
          out_request_no: params.outRequestNo,
        },
      }) as any;

      if (result.code !== '10000') {
        throw new Error(`退款失败: ${result.msg}(${result.sub_msg || ''})`);
      }

      return {
        tradeNo: result.trade_no || params.outTradeNo,
        refundAmount: result.refund_fee || params.refundAmount.toFixed(2),
        status: result.code,
      };
    } catch (error) {
      this.logger.error(`[Alipay] 退款失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 转账到支付宝账户（余额提现等）
   * 对应API：alipay.fund.trans.uni.transfer
   */
  async transfer(params: {
    outBizNo: string;
    payeeAccount: string;
    amount: number;
    remark?: string;
    payerShowName?: string;
    payeeRealName?: string;
    payeeType?: 'ALIPAY_LOGONID' | 'ALIPAY_USER_ID';
  }): Promise<{ success: boolean; orderId?: string; failReason?: string }> {
    if (!this.sdk) throw new Error('支付宝服务未正确初始化');

    try {
      const result = await this.sdk.exec('alipay.fund.trans.uni.transfer', {
        bizContent: {
          out_biz_no: params.outBizNo,
          trans_amount: params.amount.toFixed(2),
          product_code: 'TRANS_ACCOUNT_NO_PWD',
          biz_scene: 'DIRECT_TRANSFER',
          ord_time: new Date().toISOString().replace('T', ' ').replace(/\.\d+Z/, ''),
          payee_info: {
            identity: params.payeeAccount,
            identity_type: params.payeeType || 'ALIPAY_LOGONID',
            name: params.payeeRealName || undefined,
          },
          remark: params.remark || '古月租车转账',
          payer_show_name: params.payerShowName || '古月租车',
        },
      }) as any;

      if (result.code === '10000') {
        return { success: true, orderId: result.order_id };
      }

      // 失败但已知原因
      return {
        success: false,
        failReason: `${result.msg}(${result.sub_msg || ''})`,
      };
    } catch (error) {
      this.logger.error(`[Alipay] 转账失败: ${error.message}`);
      return { success: false, failReason: error.message };
    }
  }

  // ==================== 回调验证 ====================

  /**
   * 验证支付宝回调签名
   * 必须对所有异步通知调用此方法验证！
   * 
   * @param postData - 支付宝回调POST的原始数据
   * @returns 是否验证通过
   */
  verifyCallback(postData: Record<string, string>): boolean {
    if (!this.sdk) {
      this.logger.warn('[Alipay] SDK未初始化，跳过验签');
      return false;
    }

    try {
      const verified = this.sdk.checkNotifySign(postData);
      if (!verified) {
        this.logger.warn('[Alipay] 回调签名验证失败！');
        // 打印关键信息便于排查（注意不要打印完整私钥）
        this.logger.warn(`[Alipay] 异常回调数据: out_trade_no=${postData.out_trade_no}, trade_status=${postData.trade_status}`);
      }
      return verified;
    } catch (error) {
      this.logger.error(`[Alipay] 验签异常: ${error.message}`);
      return false;
    }
  }

  /**
   * 构造支付宝标准响应（返回给支付宝确认接收）
   * @param success - 是否处理成功
   */
  static buildCallbackResponse(success: boolean): string {
    return success ? 'success' : 'failure';
  }
}
