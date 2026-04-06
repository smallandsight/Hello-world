// ==================== 格式化工具函数 ====================

/**
 * 金额格式化（分 → 元）
 * @param amount 金额（分）
 * @param prefix 前缀符号
 * @returns 如 "¥128.00"
 */
export function formatMoney(amount: number, prefix = '¥'): string {
  const yuan = (amount / 100).toFixed(2)
  return `${prefix}${yuan}`
}

/**
 * 金额格式化（元，保留2位小数）
 */
export function formatMoneyYuan(amount: number, prefix = '¥'): string {
  return `${prefix}${Number(amount).toFixed(2)}`
}

/**
 * 手机号脱敏
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

/**
 * 身份证脱敏
 */
export function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length < 8) return idCard
  return `${idCard.slice(0, 4)}****${idCard.slice(-4)}`
}

/** ==================== 日期时间 ==================== */

/**
 * 日期格式化
 */
export function formatDate(
  date: string | Date,
  fmt = 'YYYY-MM-DD HH:mm:ss',
): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return fmt
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/** 简短日期 YYYY-MM-DD */
export function formatDateShort(date: string | Date): string {
  return formatDate(date, 'YYYY-MM-DD')
}

/** 时间 HH:mm */
export function formatTimeShort(date: string | Date): string {
  return formatDate(date, 'HH:mm')
}

/**
 * 相对时间（如 "5分钟前"、"3天前"）
 */
export function formatRelativeTime(date: string | Date): string {
  if (!date) return ''
  const now = new Date()
  const target = new Date(date)
  const diff = now.getTime() - target.getTime()

  if (diff < 0) return '刚刚'

  const minutes = Math.floor(Math.abs(diff) / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return '刚刚'
  if (hours < 1) return `${minutes}分钟前`
  if (days < 1) return `${hours}小时前`
  if (days < 30) return `${days}天前`

  // 超过30天显示具体日期
  return formatDate(target, 'MM-DD HH:mm')
}
