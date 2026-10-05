import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/** Teach tailwind-merge the custom font sizes from index.css so `text-title` isn't read as a text color. */
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ['stat', 'display', 'title', 'body', 'control'] } },
})

/**
 * Join conditional class names and resolve Tailwind conflicts (last one wins):
 *   cn('size-12 bg-white', active && 'bg-primary', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
