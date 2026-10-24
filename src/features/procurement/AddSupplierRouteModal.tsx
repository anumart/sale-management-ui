import { useState, type ChangeEvent } from 'react'
import { IconMapPin } from '@/components/icons'
import { Button, Modal, TextArea, TextField } from '@/components/ui'
import { toast } from '@/stores/toastStore'
import { useProcurementStore } from './store'
import { formatRouteAddress, isValidLatitude, isValidLongitude } from './utils'

export interface AddSupplierRouteModalProps {
  open: boolean
  onClose: () => void
  supplierId: string
}

const emptyForm = {
  routeCode: '',
  routeName: '',
  addressLine: '',
  subdistrict: '',
  district: '',
  province: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  mapUrl: '',
  directions: '',
  contactPerson: '',
  phone: '',
  operatingHours: '',
}

export function AddSupplierRouteModal({ open, onClose, supplierId }: AddSupplierRouteModalProps) {
  const addSupplierRoute = useProcurementStore((s) => s.addSupplierRoute)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof typeof emptyForm, string>>>({})

  const set = (key: keyof typeof emptyForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleClose = () => {
    setForm(emptyForm)
    setErrors({})
    onClose()
  }

  const handleSave = () => {
    const nextErrors: typeof errors = {}
    if (!form.routeName.trim()) nextErrors.routeName = 'กรุณากรอกชื่อจุดรับสินค้า/สวน'
    if (!form.addressLine.trim()) nextErrors.addressLine = 'กรุณากรอกเลขที่/ถนน'
    if (!form.subdistrict.trim()) nextErrors.subdistrict = 'กรุณากรอกตำบล/แขวง'
    if (!form.district.trim()) nextErrors.district = 'กรุณากรอกอำเภอ/เขต'
    if (!form.province.trim()) nextErrors.province = 'กรุณากรอกจังหวัด'
    if (!/^\d{5}$/.test(form.postalCode.trim())) nextErrors.postalCode = 'รหัสไปรษณีย์ 5 หลัก'
    const lat = form.latitude.trim()
    const lng = form.longitude.trim()
    if (lat || lng) {
      if (!lat || !isValidLatitude(Number(lat))) nextErrors.latitude = 'ละติจูด -90 ถึง 90'
      if (!lng || !isValidLongitude(Number(lng))) nextErrors.longitude = 'ลองจิจูด -180 ถึง 180'
    }
    if (form.mapUrl.trim() && !/^https?:\/\//i.test(form.mapUrl.trim())) nextErrors.mapUrl = 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://'
    if (!form.contactPerson.trim()) nextErrors.contactPerson = 'กรุณากรอกผู้ติดต่อ'
    if (!form.phone.trim()) nextErrors.phone = 'กรุณากรอกเบอร์โทรศัพท์'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    addSupplierRoute({
      id: `sr-${Date.now()}`,
      supplierId,
      routeCode: form.routeCode.trim() || `SR-${Date.now().toString().slice(-6)}`,
      routeName: form.routeName.trim(),
      addressLine: form.addressLine.trim(),
      subdistrict: form.subdistrict.trim(),
      district: form.district.trim(),
      province: form.province.trim(),
      postalCode: form.postalCode.trim(),
      address: formatRouteAddress({
        addressLine: form.addressLine.trim(),
        subdistrict: form.subdistrict.trim(),
        district: form.district.trim(),
        province: form.province.trim(),
        postalCode: form.postalCode.trim(),
      }),
      latitude: lat ? Number(lat) : undefined,
      longitude: lng ? Number(lng) : undefined,
      mapUrl: form.mapUrl.trim() || undefined,
      directions: form.directions.trim() || undefined,
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      operatingHours: form.operatingHours.trim() || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
    })
    toast.success(`เพิ่มจุดรับสินค้า "${form.routeName.trim()}" แล้ว`)
    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="เพิ่มจุดรับสินค้า"
      description="ลงทะเบียนสวน/คลังที่เป็นจุดรับสินค้าใหม่ของซัพพลายเออร์รายนี้"
      icon={<IconMapPin />}
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave}>บันทึก</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="รหัสจุดรับสินค้า" placeholder="เว้นว่างเพื่อให้ระบบสร้างให้" value={form.routeCode} onChange={set('routeCode')} />
        <TextField label="ชื่อจุดรับสินค้า / สวน" required placeholder="สวนดอกกุหลาบแม่ริม" value={form.routeName} onChange={set('routeName')} error={errors.routeName} />
        <TextField label="เวลาทำการ" placeholder="06:00–10:00 น. ทุกวัน" value={form.operatingHours} onChange={set('operatingHours')} />
        <TextField label="ผู้ติดต่อ" required placeholder="คุณสมหญิง ปทุมมา" value={form.contactPerson} onChange={set('contactPerson')} error={errors.contactPerson} />
        <TextField label="โทรศัพท์" required placeholder="053-201-4477" value={form.phone} onChange={set('phone')} error={errors.phone} />
        <TextField
          label="เลขที่ / หมู่ / ถนน"
          required
          placeholder="45/2 หมู่ 3"
          value={form.addressLine}
          onChange={set('addressLine')}
          error={errors.addressLine}
          containerClassName="sm:col-span-2"
        />
        <TextField label="ตำบล / แขวง" required placeholder="แม่แรม" value={form.subdistrict} onChange={set('subdistrict')} error={errors.subdistrict} />
        <TextField label="อำเภอ / เขต" required placeholder="แม่ริม" value={form.district} onChange={set('district')} error={errors.district} />
        <TextField label="จังหวัด" required placeholder="เชียงใหม่" value={form.province} onChange={set('province')} error={errors.province} />
        <TextField label="รหัสไปรษณีย์" required placeholder="50180" value={form.postalCode} onChange={set('postalCode')} error={errors.postalCode} />
        <TextField label="ละติจูด (Latitude)" inputMode="decimal" placeholder="18.9055" value={form.latitude} onChange={set('latitude')} error={errors.latitude} />
        <TextField label="ลองจิจูด (Longitude)" inputMode="decimal" placeholder="98.9420" value={form.longitude} onChange={set('longitude')} error={errors.longitude} />
        <TextField
          label="ลิงก์ Google Maps"
          placeholder="https://maps.app.goo.gl/..."
          value={form.mapUrl}
          onChange={set('mapUrl')}
          error={errors.mapUrl}
          containerClassName="sm:col-span-2"
        />
        <TextArea
          label="จุดสังเกต / วิธีเข้าสวน"
          placeholder="ทางเข้าอยู่ก่อนถึงตลาด ป้ายสีเขียว"
          value={form.directions}
          onChange={set('directions')}
          containerClassName="sm:col-span-2"
        />
      </div>
    </Modal>
  )
}
