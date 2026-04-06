/**
 * 第三方服务模块 - 统一注册所有第三方API对接
 * 
 * 包含子模块：
 * - AlipayService: 支付宝（登录/支付/芝麻信用）
 * - SmsService: 阿里云短信（验证码/通知）
 * - OssService: 阿里云OSS（文件存储）
 * - AmapService: 高德地图（路径规划/地理编码）
 */
import { Module, Global } from '@nestjs/common';
import { AlipayService } from './alipay/alipay.service';
import { SmsService } from './sms/sms.service';
import { OssService } from './oss/oss.service';
import { AmapService } from './amap/amap.service';

@Global() // 全局可用
@Module({
  providers: [
    AlipayService,
    // SmsService 依赖 RedisService，通过 forwardRef 处理循环依赖
  ],
  exports: [
    AlipayService,
  ],
})
export class ThirdPartyModule {}

/**
 * 注意：SmsService 和 OssService / AmapService 的依赖关系说明：
 * 
 * SmsService → 需要 RedisService（验证码缓存）
 *   解决：在 AppModule 或 SharedModule 中导入，SmsService 通过 module import 获取
 *
 * OssService → 无外部依赖（纯SDK封装）
 * AmapService → 无外部依赖（HTTP请求）
 * AlipayService → 无外部依赖（纯SDK封装）
 * 
 * 在 app.module.ts 中添加：
 *   imports: [ThirdPartyModule]
 * 
 * 使用方式：
 *   constructor(
 *     private readonly alipayService: AlipayService,
 *     private readonly smsService: SmsService,
 *     private readonly ossService: OssService,
 *     private readonly amapService: AmapService,
 *   ) {}
 */
