import { useRef } from 'react'
import { cn } from '@/lib/cn'

export interface InputOTPProps {
  value: string
  onChange: (value: string) => void
  length?: number
  /** Draw a dash after this many boxes, e.g. 3 for 123-456 */
  separatorAfter?: number
  invalid?: boolean
  'aria-label'?: string
  className?: string
}

/** One-time-code boxes with auto-advance, backspace and paste (shadcn Input OTP). Digits only. */
export function InputOTP({ value, onChange, length = 6, separatorAfter, invalid, className, ...aria }: InputOTPProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus()
  // Fixed-length slots; ' ' marks an empty box so later digits keep their position
  const slots = Array.from({ length }, (_, i) => value[i] ?? ' ')

  const setAt = (i: number, ch: string) => {
    const next = [...slots]
    next[i] = ch || ' '
    onChange(next.join('').trimEnd())
  }

  return (
    <div role="group" {...aria} className={cn('flex items-center gap-2', className)}>
      {slots.map((ch, i) => (
        <span key={i} className="contents">
          <input
            ref={(el) => {
              refs.current[i] = el
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${i + 1}`}
            value={ch.trim()}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, '').slice(-1)
              if (!d) return
              setAt(i, d)
              focus(i + 1)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace') {
                e.preventDefault()
                if (ch.trim()) setAt(i, '')
                else if (i > 0) {
                  setAt(i - 1, '')
                  focus(i - 1)
                }
              } else if (e.key === 'ArrowLeft') focus(i - 1)
              else if (e.key === 'ArrowRight') focus(i + 1)
            }}
            onPaste={(e) => {
              e.preventDefault()
              const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
              onChange(digits)
              focus(digits.length)
            }}
            className={cn(
              'size-12 rounded-control border bg-field text-center text-title font-semibold text-ink outline-none transition-[border-color,box-shadow]',
              invalid
                ? 'border-danger shadow-[0_0_0_4px_var(--color-danger-bg)]'
                : 'border-field-edge focus:border-primary focus:shadow-[0_0_0_4px_var(--color-primary-soft)]',
            )}
          />
          {separatorAfter === i + 1 && i < length - 1 && <span aria-hidden="true" className="h-0.5 w-3 rounded-full bg-line-strong" />}
        </span>
      ))}
    </div>
  )
}
