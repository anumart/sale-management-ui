const baht = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 })

export const formatCurrency = (value: number) => baht.format(value)

/** 1500 -> "1,500" */
export const formatNumber = (value: number) => value.toLocaleString('th-TH')

/** 150000 -> "฿150K" */
export const formatCompactCurrency = (value: number) =>
  '฿' + new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

/** "5 min ago", "2 hours ago", "Yesterday" ... */
export function formatRelative(iso: string, now = Date.now()) {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'เมื่อสักครู่'
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
  const days = Math.round(hours / 24)
  return days === 1 ? 'เมื่อวาน' : `${days} วันที่แล้ว`
}
