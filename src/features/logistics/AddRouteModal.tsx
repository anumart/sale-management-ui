import { useState } from 'react'
import { IconMapPin } from '@/components/icons'
import { Button, Checkbox, Modal, TextField } from '@/components/ui'
import { toast } from '@/stores/toastStore'
import { useLogisticsStore } from './store'
import { dayLabel, daysOfWeek, type DayOfWeek } from './types'

export interface AddRouteModalProps {
  open: boolean
  onClose: () => void
  vehicleId: string | null
  vehicleCode?: string
}

export function AddRouteModal({ open, onClose, vehicleId, vehicleCode }: AddRouteModalProps) {
  const addVehicleRoute = useLogisticsStore((s) => s.addVehicleRoute)
  const [routeName, setRouteName] = useState('')
  const [runDays, setRunDays] = useState<DayOfWeek[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  const [error, setError] = useState('')

  const handleClose = () => {
    setRouteName('')
    setRunDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
    setError('')
    onClose()
  }

  const toggleDay = (day: DayOfWeek) =>
    setRunDays((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day]))

  const handleSave = () => {
    if (!vehicleId) return
    if (!routeName.trim()) {
      setError('กรุณากรอกชื่อเส้นทาง')
      return
    }
    addVehicleRoute({ id: `vr-${Date.now()}`, vehicleId, routeName: routeName.trim(), runDays, isActive: true, stops: [] })
    toast.success(`สร้างเส้นทาง "${routeName.trim()}" แล้ว เพิ่มจุดจอดต่อได้เลย`)
    handleClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="สร้างเส้นทางรถ"
      description={vehicleCode ? `เส้นทางประจำวันใหม่ของ ${vehicleCode}` : undefined}
      icon={<IconMapPin />}
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave}>สร้างเส้นทาง</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="ชื่อเส้นทาง"
          required
          placeholder="เส้นทาง A (วนเหนือ)"
          value={routeName}
          onChange={(e) => {
            setRouteName(e.target.value)
            setError('')
          }}
          error={error}
        />
        <div>
          <p className="mb-2 text-control font-medium text-ink-2">วันที่วิ่ง</p>
          <div className="flex flex-wrap gap-3">
            {daysOfWeek.map((day) => (
              <Checkbox key={day} label={dayLabel[day]} checked={runDays.includes(day)} onChange={() => toggleDay(day)} />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
