import { useState, type FormEvent } from 'react'
import { IconCheck } from '@/components/icons'
import { Autocomplete, Button, Checkbox, ChipGroup, Select, Switch, TextArea, TextField } from '@/components/ui'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/cn'
import { toApiError } from '@/lib/http'
import { toast } from '@/stores/toastStore'
import { useCreateProperty, useLocations } from '../api'
import { PROPERTY_TYPES, type NewProperty, type PropertyType } from '../types'

interface FormValues {
  name: string
  type: PropertyType | ''
  price: string
  city: string
  bedrooms: number
  description: string
  acceptBooking: boolean
  publish: boolean
}

type Errors = Partial<Record<'name' | 'type' | 'price' | 'city', string>>

const initial: FormValues = {
  name: '',
  type: '',
  price: '',
  city: '',
  bedrooms: 2,
  description: '',
  acceptBooking: true,
  publish: true,
}

function validate(v: FormValues, compact: boolean): Errors {
  const errors: Errors = {}
  if (!v.name.trim()) errors.name = 'กรุณากรอกชื่อ'
  if (!v.type) errors.type = 'กรุณาเลือกประเภท'
  if (!(Number(v.price) > 0)) errors.price = 'กรุณากรอกราคามากกว่า 0'
  if (!compact && !v.city.trim()) errors.city = 'กรุณาเลือกสถานที่'
  return errors
}

export interface AddPropertyFormProps {
  /** Compact = only the essential fields (used inside the quick-add modal) */
  compact?: boolean
  onSuccess?: () => void
  onCancel?: () => void
}

/** Create-property form with validation, autocomplete and React Query mutation (DESIGN.md §6.8). */
export function AddPropertyForm({ compact, onSuccess, onCancel }: AddPropertyFormProps) {
  const [values, setValues] = useState<FormValues>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const create = useCreateProperty()

  // Location autocomplete: debounce the typed text before querying
  const debouncedCity = useDebouncedValue(values.city, 250)
  const locations = useLocations(debouncedCity)

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const found = validate(values, !!compact)
    setErrors(found)
    if (Object.keys(found).length) return

    const input: NewProperty = {
      name: values.name.trim(),
      type: values.type as PropertyType,
      price: Number(values.price),
      city: values.city.trim() || 'Bangkok',
      bedrooms: values.bedrooms,
      description: values.description.trim() || undefined,
      acceptBooking: values.acceptBooking,
      publish: values.publish,
    }
    create.mutate(input, {
      onSuccess: (p) => {
        toast.success(`เพิ่ม ${p.name} แล้ว`)
        setValues(initial)
        onSuccess?.()
      },
      onError: (err) => toast.error(toApiError(err).message),
    })
  }

  return (
    <form noValidate onSubmit={onSubmit} className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
      <TextField
        label="ชื่อ"
        required
        placeholder="เช่น 45 ถนนสุขุมวิท"
        value={values.name}
        onChange={(e) => set('name', e.target.value)}
        error={errors.name}
        containerClassName="sm:col-span-2"
      />
      <Select
        label="ประเภท"
        required
        placeholder="เลือกประเภท"
        options={PROPERTY_TYPES.map((t) => ({ value: t, label: t }))}
        value={values.type}
        onChange={(type) => set('type', type)}
        error={errors.type}
      />
      <TextField
        label="ราคา"
        required
        type="number"
        min={1}
        inputMode="numeric"
        prefix="$"
        placeholder="0.00"
        value={values.price}
        onChange={(e) => set('price', e.target.value)}
        error={errors.price}
      />

      {!compact && (
        <>
          <Autocomplete
            label="สถานที่"
            required
            placeholder="ค้นหาเมือง…"
            inputValue={values.city}
            onInputChange={(v) => set('city', v)}
            options={locations.data ?? []}
            loading={locations.isFetching}
            getOptionLabel={(c) => c}
            onSelect={(c) => set('city', c)}
            error={errors.city}
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <ChipGroup
              label="ห้องนอน"
              value={values.bedrooms}
              onChange={(n) => set('bedrooms', n)}
              options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: n === 5 ? '5+' : String(n) }))}
            />
          </div>
          <TextArea
            label="รายละเอียด"
            placeholder="คำอธิบายสั้นๆ…"
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            containerClassName="sm:col-span-2"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
            <Checkbox
              label="รับจองออนไลน์"
              checked={values.acceptBooking}
              onChange={(e) => set('acceptBooking', e.target.checked)}
            />
            <Switch label="เผยแพร่" checked={values.publish} onChange={(e) => set('publish', e.target.checked)} />
          </div>
        </>
      )}

      <div className={cn('flex justify-end gap-3 sm:col-span-2', !compact && 'mt-1 border-t border-line pt-5')}>
        <Button
          variant="outline"
          type={onCancel ? 'button' : 'reset'}
          onClick={() => {
            setValues(initial)
            setErrors({})
            onCancel?.()
          }}
        >
          {onCancel ? 'ยกเลิก' : 'ล้างค่า'}
        </Button>
        <Button type="submit" loading={create.isPending}>
          {!create.isPending && <IconCheck />}
          {compact ? 'เพิ่ม' : 'บันทึก'}
        </Button>
      </div>
    </form>
  )
}
