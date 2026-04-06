/**
 * 敏感数据脱敏工具
 * 提供手机号/身份证/姓名/银行卡等常见字段的脱敏能力
 *
 * 使用方式：
 * 1. ResponseInterceptor 中全局自动脱敏
 * 2. @Desensitize() 装饰器标记需要脱敏的字段
 * 3. 日志输出前手动调用
 */

/** 脱敏结果缓存（避免重复计算） */
const cache = new Map<string, string>();

export function maskPhone(phone: string | null): string | null {
  if (!phone || phone.length < 7) return phone;
  const key = `phone:${phone}`;
  if (cache.has(key)) return cache.get(key)!;
  const result = phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
  cache.set(key, result);
  return result;
}

export function maskIdCard(idCard: string | null): string | null {
  if (!idCard || idCard.length < 4) return idCard;
  const key = `ic:${idCard}`;
  if (cache.has(key)) return cache.get(key)!;
  // 身份证号：保留前3和后4，中间用*替代
  if (idCard.length <= 7) return '***';
  const result = idCard.substring(0, 3) + '*'.repeat(idCard.length - 6) + idCard.substring(idCard.length - 3);
  cache.set(key, result);
  return result;
}

export function maskLicenseNo(license: string | null): string | null {
  // 驾驶证号格式同身份证
  return maskIdCard(license);
}

export function maskName(name: string | null): string | null {
  if (!name || name.length === 0) return name;
  if (name.length <= 1) return '*';
  if (name.length <= 2) return name.charAt(0) + '*';
  return name.charAt(0) + '*';
}

export function maskBankCard(bankCard: string | null): string | null {
  if (!bankCard || bankCard.length < 8) return bankCard;
  const key = `bc:${bankCard}`;
  if (cache.has(key)) return cache.get(key)!;
  // 银行卡：显示前4后4
  const result = bankCard.substring(0, 4) + '****' + bankCard.substring(bankCard.length - 4);
  cache.set(key, result);
  return result;
}

/**
 * 批量对象脱敏
 * 根据白名单字段保留，其余按类型自动脱敏
 */
export function desensitizeObject(obj: any, sensitiveFields?: string[]): any {
  if (!obj || typeof obj !== 'object') return obj;

  const result = { ...obj };

  for (const key of Object.keys(result)) {
    const val = result[key];

    // 跳过null/undefined/非字符串字段
    if (val === null || val === undefined || typeof val !== 'string') continue;

    // 白名单字段不脱敏
    if (sensitiveFields?.includes(key)) continue;

    // 按字段名规则匹配脱敏
    if (/phone|mobile|cell/i.test(key)) result[key] = maskPhone(val);
    else if (/id_card|idcard|identity/i.test(key)) result[key] = maskIdCard(val);
    else if (/license|driver/i.test(key)) result[key] = maskLicenseNo(val);
    elif (/real_name|name$/i.test(key) && !/username|nickname$/i.test(key)) result[key] = maskName(val);
    else if (/bank.*card|card_no/i.test(key)) result[key] = maskBankCard(val);
  }

  return result;
}
