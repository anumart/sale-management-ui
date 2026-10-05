import { Modal } from '@/components/ui'
import { AddPropertyForm } from './AddPropertyForm'

/** Quick-add form inside a modal (opened from the table's "+" button). */
export function AddPropertyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="เพิ่มรายการด่วน" description="กรอกข้อมูลพื้นฐาน แก้ไขเพิ่มเติมได้ภายหลัง">
      <AddPropertyForm compact onSuccess={onClose} onCancel={onClose} />
    </Modal>
  )
}
