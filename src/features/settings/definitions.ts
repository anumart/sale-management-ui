/**
 * Business rules the admin can tune on /settings. Every value only drives a warning (row tint, risk card, ranking) —
 * none of them blocks work. Reports always use the current value, including for past periods.
 */

export type SettingGroup = 'sales' | 'procurement' | 'inventory' | 'production'

export const settingGroups: { id: SettingGroup; label: string; description: string }[] = [
  { id: 'sales', label: 'ขาย', description: 'หน้าสรุปผลฝากขาย' },
  { id: 'procurement', label: 'จัดซื้อ', description: 'การรับของจากซัพพลายเออร์' },
  { id: 'inventory', label: 'คลังสินค้า', description: 'LOT สินค้าสำเร็จรูป' },
  { id: 'production', label: 'ผลิต', description: 'ผลการผลิต' },
]

export interface SettingDefinition {
  key: string
  group: SettingGroup
  label: string
  hint: string
  unit: string
  defaultValue: number
  min: number
  max: number
}

export const settingDefinitions = [
  {
    key: 'wasteWarnPercent',
    group: 'sales',
    label: 'อัตราของเสีย: เตือน',
    hint: 'ของเสีย ÷ ของที่ส่งเข้าร้าน ตั้งแต่ค่านี้ขึ้นเป็นสีส้ม',
    unit: '%',
    defaultValue: 10,
    min: 0,
    max: 100,
  },
  {
    key: 'wasteDangerPercent',
    group: 'sales',
    label: 'อัตราของเสีย: อันตราย',
    hint: 'ตั้งแต่ค่านี้ขึ้นเป็นสีแดง ต้องมากกว่าค่าเตือน',
    unit: '%',
    defaultValue: 15,
    min: 0,
    max: 100,
  },
  {
    key: 'wasteMinDelivered',
    group: 'sales',
    label: 'จำนวนส่งขั้นต่ำก่อนจัดอันดับของเสีย',
    hint: 'สาขาที่ส่งน้อยกว่านี้ไม่ติดอันดับ เพราะเสียไม่กี่ชิ้นก็ทำให้ % สูงเกินจริง',
    unit: 'ชิ้น',
    defaultValue: 100,
    min: 0,
    max: 100_000,
  },
  {
    key: 'receiptVariancePercent',
    group: 'procurement',
    label: 'รับของต่างจากที่สั่ง',
    hint: 'รับจริงมากหรือน้อยกว่าที่สั่งเกินค่านี้ ขึ้นในการ์ดความเสี่ยงที่แดชบอร์ด',
    unit: '%',
    defaultValue: 10,
    min: 0,
    max: 100,
  },
  {
    key: 'expiryWarningDays',
    group: 'inventory',
    label: 'เตือน LOT ใกล้หมดอายุล่วงหน้า',
    hint: 'LOT ที่ยังมีของและจะหมดอายุภายในจำนวนวันนี้ ขึ้นในการ์ดความเสี่ยง',
    unit: 'วัน',
    defaultValue: 7,
    min: 0,
    max: 60,
  },
  {
    key: 'lowYieldPercent',
    group: 'production',
    label: 'อัตราผลผลิตต่ำ',
    hint: 'ใบสั่งผลิตที่ผลิตได้ต่ำกว่าค่านี้ (ผลิตได้ ÷ วางแผน) ขึ้นในการ์ดความเสี่ยง',
    unit: '%',
    defaultValue: 95,
    min: 0,
    max: 100,
  },
] as const satisfies readonly SettingDefinition[]

export type SettingKey = (typeof settingDefinitions)[number]['key']
export type Settings = Record<SettingKey, number>

export const defaultSettings = Object.fromEntries(settingDefinitions.map((d) => [d.key, d.defaultValue])) as Settings

export const settingByKey = (key: SettingKey): SettingDefinition => settingDefinitions.find((d) => d.key === key)!

/** Range checks per value plus rules across values. Returns an error message per invalid key. */
export function validateSettings(values: Settings): Partial<Record<SettingKey, string>> {
  const errors: Partial<Record<SettingKey, string>> = {}
  for (const d of settingDefinitions) {
    const v = values[d.key]
    if (!Number.isFinite(v)) errors[d.key] = 'กรอกตัวเลข'
    else if (v < d.min || v > d.max) errors[d.key] = `ต้องอยู่ระหว่าง ${d.min.toLocaleString()}–${d.max.toLocaleString()} ${d.unit}`
  }
  if (!errors.wasteDangerPercent && !errors.wasteWarnPercent && values.wasteDangerPercent <= values.wasteWarnPercent)
    errors.wasteDangerPercent = 'ต้องมากกว่าค่าเตือน'
  return errors
}
