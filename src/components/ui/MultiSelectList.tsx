import { useState } from 'react'
import { IconSearch } from '@/components/icons'
import { cn } from '@/lib/cn'
import { Checkbox } from './Checkbox'

export interface MultiSelectOption {
  value: string
  label: string
  /** How many results this value would give — used to sort and shown on the right. */
  count?: number
}

export interface MultiSelectListProps {
  label: string
  options: MultiSelectOption[]
  value: string[]
  onChange: (next: string[]) => void
  /** The search box only appears above this many options. */
  searchThreshold?: number
  /** Rows rendered at once; the rest are reached by searching. */
  limit?: number
}

/** Checkbox list for a long set of options: search box, selected values first, then most results first. */
export function MultiSelectList({ label, options, value, onChange, searchThreshold = 8, limit = 30 }: MultiSelectListProps) {
  const [term, setTerm] = useState('')
  const needle = term.trim().toLowerCase()
  const searchable = options.length > searchThreshold

  const matches = options
    .filter((o) => value.includes(o.value) || !needle || o.label.toLowerCase().includes(needle))
    .sort((a, b) => {
      const sa = value.includes(a.value)
      const sb = value.includes(b.value)
      if (sa !== sb) return sa ? -1 : 1
      if ((a.count ?? 0) !== (b.count ?? 0)) return (b.count ?? 0) - (a.count ?? 0)
      return a.label.localeCompare(b.label, 'th')
    })
  const shown = matches.slice(0, limit)
  const hidden = matches.length - shown.length

  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-control font-medium text-ink-2">
        {label}
        {value.length > 0 && <span className="ml-2 text-muted">เลือก {value.length}</span>}
      </legend>
      {searchable && (
        <div className="relative">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={`ค้นหาจาก ${options.length} รายการ`}
            aria-label={`ค้นหา${label}`}
            className="h-9 w-full rounded-lg border border-field-edge bg-field pr-3 pl-9 text-control text-ink placeholder:text-placeholder"
          />
        </div>
      )}
      <div className="max-h-52 overflow-y-auto rounded-xl border border-line bg-field p-1">
        {shown.length === 0 && <p className="px-3 py-4 text-center text-control text-muted">ไม่พบ “{term}”</p>}
        {shown.map((o) => {
          const on = value.includes(o.value)
          return (
            <label
              key={o.value}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-control hover:bg-hover',
                !on && o.count === 0 && 'opacity-50',
              )}
            >
              <Checkbox checked={on} onChange={() => toggle(o.value)} />
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{o.label}</span>
              {o.count !== undefined && <span className="text-sm text-muted tabular-nums">{o.count}</span>}
            </label>
          )
        })}
      </div>
      {(hidden > 0 || searchable) && (
        <p className="text-sm text-muted">
          {hidden > 0 && `แสดง ${shown.length} รายการแรก อีก ${hidden} รายการ พิมพ์เพื่อค้นหา · `}
          ที่เลือกไว้ขึ้นก่อน แล้วเรียงตามจำนวนผลลัพธ์
        </p>
      )}
    </fieldset>
  )
}
