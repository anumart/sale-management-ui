import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export interface SliderProps extends Omit<ComponentProps<'input'>, 'type' | 'value' | 'onChange' | 'min' | 'max'> {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

/** Range input with a primary-filled track and white thumb (shadcn Slider). */
export function Slider({ value, onChange, min = 0, max = 100, className, style, ...props }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ ...style, background: `linear-gradient(to right, var(--color-primary) ${pct}%, var(--color-fill-strong) ${pct}%)` }}
      className={cn(
        'h-2 w-full cursor-pointer appearance-none rounded-full outline-none disabled:cursor-not-allowed disabled:opacity-45',
        '[&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-card [&::-webkit-slider-thumb]:transition-shadow',
        'focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_4px_var(--color-primary-soft)]',
        '[&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-white',
        className,
      )}
      {...props}
    />
  )
}
