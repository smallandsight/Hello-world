/**
 * 数据脱敏工具函数单元测试
 * 覆盖：SEC-01 ~ SEC-05 (5例)
 */
import { maskPhone, maskIdCard, maskName, maskBankCard, maskLicenseNo } from './desensitize';

describe('Desensitize Utils', () => {
  describe('maskPhone - 手机号脱敏 (SEC-01)', () => {
    it('应正确脱敏11位手机号', () => {
      expect(maskPhone('13812345678')).toBe('138****5678');
    });

    it('应正确处理不同号段', () => {
      expect(maskPhone('15900001111')).toBe('159****1111');
      expect(maskPhone('18098765432')).toBe('180****5432');
    });

    it('空值应返回空字符串', () => {
      expect(maskPhone('')).toBe('');
      expect(maskPhone(null as any)).toBe('');
      expect(maskPhone(undefined as any)).toBe('');
    });

    it('非标准长度手机号应原样返回', () => {
      expect(maskPhone('12345')).toBe('12345');
    });
  });

  describe('maskIdCard - 身份证脱敏 (SEC-02)', () => {
    it('应正确脱敏18位身份证号', () => {
      expect(maskIdCard('110101199001011234')).toBe('110101********1234');
    });

    it('应正确处理15位老版身份证', () => {
      expect(maskIdCard('110101900101123')).toBe('110101******5123');
    });

    it('空值应返回空字符串', () => {
      expect(maskIdCard('')).toBe('');
      expect(maskIdCard(null as any)).toBe('');
    });
  });

  describe('maskName - 姓名脱敏 (SEC-03)', () => {
    it('两个字姓名应隐藏第二个字', () => {
      expect(maskName('张三')).toBe('张*');
    });

    it('三个字及以上姓名应隐藏中间', () => {
      expect(maskName('欧阳锋')).toBe('欧阳*');
      expect(maskName('诸葛亮')).toBe('诸*亮');
    });

    it('单字姓名应返回原字加星号', () => {
      expect(maskName('赵')).toBe('赵*');
    });

    it('空值应返回空字符串', () => {
      expect(maskName('')).toBe('');
    });
  });

  describe('maskBankCard - 银行卡脱敏 (SEC-04)', () => {
    it('应正确脱敏16位银行卡号', () => {
      expect(maskBankCard('6222021234567890123')).toBe('622202*******90123');
    });

    it('应正确脱敏19位银行卡号', () => {
      expect(maskBankCard('6222021234567890123456')).toBe('622202*********3456');
    });

    it('空值应返回空字符串', () => {
      expect(maskBankCard('')).toBe('');
    });
  });

  describe('maskLicenseNo - 驾驶证号脱敏 (SEC-05)', () => {
    it('驾驶证号使用与身份证相同的规则', () => {
      expect(maskLicenseNo('110101199001011234')).toBe('110101********1234');
    });

    it('空值应返回空字符串', () => {
      expect(maskLicenseNo('')).toBe('');
    });
  });
});
