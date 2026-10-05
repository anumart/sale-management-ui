import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'
import { Tooltip, type TooltipProps } from './Tooltip'

export type ButtonVariant = 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'accent' | 'dark' | 'soft' | 'outline' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white shadow-primary hover:bg-primary-hover',
  success: 'bg-success text-on-success hover:bg-success-hover',
  warning: 'bg-warning text-on-warning hover:bg-warning-hover',
  info: 'bg-info text-on-info hover:bg-info-hover',
  accent: 'bg-accent text-on-accent hover:bg-accent-hover',
  dark: 'bg-dark text-on-dark hover:bg-dark-hover',
  soft: 'bg-primary-soft text-primary-fg hover:bg-primary-soft-hover',
  outline: 'bg-surface text-ink border border-line-strong hover:border-primary hover:text-primary-fg',
  ghost: 'bg-transparent text-primary-fg hover:bg-primary-soft',
  danger: 'bg-danger text-white hover:bg-danger-hover',
}

/** `outlined`: same intent color as a 1px border + text on a white surface, tinted on hover. */
const outlinedVariants: Record<ButtonVariant, string> = {
  primary: 'bg-surface border border-primary text-primary-fg hover:bg-primary-soft',
  success: 'bg-surface border border-success text-success-fg hover:bg-success-bg',
  warning: 'bg-surface border border-warning text-warning-fg hover:bg-warning-bg',
  info: 'bg-surface border border-info text-info-fg hover:bg-info-bg',
  accent: 'bg-surface border border-accent text-accent-dark hover:bg-accent-soft',
  dark: 'bg-surface border border-line-strong text-ink hover:bg-fill',
  soft: 'bg-surface border border-line-strong text-ink-2 hover:border-primary hover:text-primary-fg',
  outline: variants.outline,
  ghost: variants.ghost,
  danger: 'bg-surface border border-danger text-danger-fg hover:bg-danger-bg',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm gap-1.5 [&_svg]:size-4',
  md: 'h-12 px-6 text-control gap-2 [&_svg]:size-5',
  lg: 'h-14 px-8 text-base gap-2.5 [&_svg]:size-5',
}

const iconSizes: Record<ButtonSize, string> = {
  sm: 'size-9 [&_svg]:size-5',
  md: 'size-12 [&_svg]:size-6',
  lg: 'size-14 [&_svg]:size-7',
}

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Square icon-only button — pass an aria-label */
  iconOnly?: boolean
  /** Make an icon-only button circular */
  round?: boolean
  loading?: boolean
  /** Outline version of the variant: colored border and text instead of a solid fill */
  outlined?: boolean
  /** Hover/focus label (use on icon-only buttons). Doubles as the aria-label when that isn't given. */
  tooltip?: string
  /** Tooltip alignment; defaults to `end` so labels on right-hand action buttons stay inside table scroll areas. */
  tooltipAlign?: TooltipProps['align']
}

/** Standard button (DESIGN.md §6.9): pill-shaped, 14px radius for icon-only, one primary per area. */
export function Button({
  variant = 'primary',
  size = 'md',
  iconOnly,
  round,
  loading,
  outlined,
  disabled,
  className,
  children,
  type = 'button',
  tooltip,
  tooltipAlign = 'end',
  ...props
}: ButtonProps) {
  const button = (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center border-2 border-transparent font-medium whitespace-nowrap',
        iconOnly ? 'rounded-control' : 'rounded-full',
        'transition-[background-color,color,border-color,transform,box-shadow] duration-300 ease-smooth',
        'active:not-disabled:scale-[0.97] active:not-disabled:duration-100',
        'disabled:cursor-not-allowed disabled:opacity-45',
        outlined ? outlinedVariants[variant] : variants[variant],
        iconOnly ? iconSizes[size] : sizes[size],
        round && 'rounded-full',
        className,
      )}
      aria-label={tooltip}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
  return tooltip ? (
    <Tooltip content={tooltip} align={tooltipAlign}>
      {button}
    </Tooltip>
  ) : (
    button
  )
}
