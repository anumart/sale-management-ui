import { Card, CardHeader } from '@/components/ui'
import { AddPropertyForm } from './AddPropertyForm'

export function AddPropertyCard() {
  return (
    <Card>
      <CardHeader title="เพิ่มรายการใหม่" subtitle="ฟอร์มพร้อมการตรวจสอบข้อมูล" />
      <AddPropertyForm />
    </Card>
  )
}
