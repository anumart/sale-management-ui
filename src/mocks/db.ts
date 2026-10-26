/**
 * In-memory data used by the mock API (src/mocks/handlers.ts).
 * Replace with a real backend by setting VITE_USE_MOCK=false.
 */
import type { User } from '@/features/auth/types'
import type { AppNotification } from '@/features/notifications/types'
import { PROPERTY_STATUSES, PROPERTY_TYPES, type Property } from '@/features/properties/types'

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

export const me: User = {
  id: 1,
  name: 'สมชาย ใจดี',
  email: 'john.carter@gmail.com',
  role: 'ผู้จัดการฝ่ายขาย',
  isAdmin: true,
  avatarUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
}

const streets = ['Maple Avenue', 'Villa Street', 'Garden Street', 'Oak Lane', 'Sunset Blvd', 'River Road', 'Pine Court', 'Lake View', 'Hillside Drive', 'Cedar Street', 'Park Avenue', 'Ocean Drive']
export const cities = ['Springfield', 'Riverside', 'Fairview', 'Madison', 'Georgetown', 'Franklin', 'Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya', 'Hua Hin', 'Khon Kaen']

export const makeCode = (id: number) => '#PR' + (738465 + id * 7919).toString(36).toUpperCase()

export const properties: Property[] = Array.from({ length: 27 }, (_, i) => ({
  id: i + 1,
  code: makeCode(i + 1),
  name: `${100 + ((i * 37) % 900)} ${streets[i % streets.length]}`,
  type: PROPERTY_TYPES[(i * 7) % PROPERTY_TYPES.length],
  city: cities[(i * 5) % 6],
  price: 80_000 + ((i * 45_713) % 920_000),
  bedrooms: 1 + (i % 5),
  status: PROPERTY_STATUSES[(i * 11) % 3],
}))

export const notifications: AppNotification[] = [
  { id: 1, type: 'payment', title: 'ได้รับชำระเงิน', text: 'ร้านดอกไม้อารีย์ ชำระใบแจ้งหนี้ INV-2026-0001', createdAt: minutesAgo(5), read: false },
  { id: 2, type: 'maintenance', title: 'มีอีเมลสั่งซื้อใหม่', text: 'นำเข้า order จากอีเมลของลูกค้า รอตรวจสอบ', createdAt: minutesAgo(32), read: false },
  { id: 3, type: 'booking', title: 'ยืนยัน order แล้ว', text: 'order ของลูกค้าได้รับการยืนยัน รอผลิต', createdAt: minutesAgo(120), read: false },
  { id: 4, type: 'alert', title: 'วัตถุดิบใกล้หมด', text: 'สต็อกวัตถุดิบบางรายการต่ำกว่าที่ต้องใช้', createdAt: minutesAgo(60 * 26), read: true },
  { id: 5, type: 'payment', title: 'ชำระใบแจ้งหนี้แล้ว', text: 'ลูกค้าชำระใบแจ้งหนี้ #INV-2041', createdAt: minutesAgo(60 * 50), read: true },
]
