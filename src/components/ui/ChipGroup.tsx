import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface ChipGroupProps<V extends string | number> {
  label?: ReactNode
  name?: string
  value: V
  options: { value: V; label: ReactNode }[]
  onChange: (value: V) => void
}

/** Single-choice pill chips (radio group), e.g. number of bedrooms. */
export function ChipGroup<V extends string | number>({ label, name, value, options, onChange }: ChipGroupProps<V>) {
  const autoId = useId()
  const groupName = name ?? autoId
  return (
    <fieldset className="flex flex-col gap-2">
      {label && <legend className="mb-2 text-control font-medium text-ink-2">{label}</legend>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const id = `${groupName}-${o.value}`
          return (
            <span key={String(o.value)}>
              <input
                type="radio"
                id={id}
                name={groupName}
                className="peer sr-only"
                checked={o.value === value}
                onChange={() => onChange(o.value)}
              />
              <label
                htmlFor={id}
                className={cn(
                  'grid h-10 min-w-12 cursor-pointer place-items-center rounded-full border border-field-edge bg-field px-4 text-control font-medium text-ink-2',
                  'peer-checked:border-primary peer-checked:grad-primary peer-checked:text-on-primary',
                  'peer-focus-visible:shadow-[0_0_0_4px_var(--color-primary-soft)]',
                )}
              >
                {o.label}
              </label>
            </span>
          )
        })}
      </div>
    </fieldset>
  )
}
