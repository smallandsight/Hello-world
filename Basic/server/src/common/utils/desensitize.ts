/**
 * 敏感数据脱敏工具
 */

export function maskPhone(phone: string | null): string {
  if (!phone || phone.length < 7) return '';
  return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
}

export function maskIdCard(idCard: string | null): string {
  if (!idCard) return '';
  if (idCard.length <= 7) return '***';
  const starLen = idCard.length - 10;
  return idCard.substring(0, 6) + '*'.repeat(Math.max(starLen, 4)) + idCard.substring(idCard.length - 4);
}

export function maskLicenseNo(license: string | null): string {
  return maskIdCard(license);
}

export function maskName(name: string | null): string {
  if (!name || name.length === 0) return '';
  if (name.length === 1) return name + '*';
  if (name.length === 2) return name.charAt(0) + '*';
  return name.substring(0, 2) + '*';
}

export function maskBankCard(bankCard: string | null): string {
  if (!bankCard || bankCard.length < 8) return '';
  const prefix = bankCard.substring(0, 6);
  const suffix = bankCard.substring(bankCard.length - 5);
  const middleLen = bankCard.length - 11;
  return prefix + '*'.repeat(Math.max(middleLen, 4)) + suffix;
}

/**
 * 批量对象脱敏（根据字段名规则匹配）
 */
export function desensitizeObject(obj: any, sensitiveFields?: string[]): any {
  if (!obj || typeof obj !== 'object') return obj;

  const result = { ...obj };

  for (const key of Object.keys(result)) {
    const val = result[key];
    if (val === null || val === undefined || typeof val !== 'string') continue;
    if (sensitiveFields?.includes(key)) continue;

    if (/phone|mobile|cell/i.test(key)) result[key] = maskPhone(val);
    else if (/id_card|idcard|identity/i.test(key)) result[key] = maskIdCard(val);
    else if (/license|driver/i.test(key)) result[key] = maskLicenseNo(val);
    else if (/real_name|name$/i.test(key) && !/username|nickname$/i.test(key)) result[key] = maskName(val);
    else if (/bank.*card|card_no/i.test(key)) result[key] = maskBankCard(val);
  }

  return result;
}
