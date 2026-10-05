import type { ReactNode } from 'react'
import { create } from 'zustand'

export interface ConfirmOptions {
  title: ReactNode
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
}

interface ConfirmState {
  request: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
  open: (options: ConfirmOptions) => Promise<boolean>
  settle: (ok: boolean) => void
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  request: null,
  open: (options) =>
    new Promise<boolean>((resolve) => {
      get().request?.resolve(false) // only one confirm at a time
      set({ request: { ...options, resolve } })
    }),
  settle: (ok) => {
    get().request?.resolve(ok)
    set({ request: null })
  },
}))

/**
 * Imperative confirm box. Rendered by <ConfirmHost /> in the app layout.
 *   if (await confirm({ title: 'Delete?', tone: 'danger' })) { … }
 */
export const confirm = (options: ConfirmOptions) => useConfirmStore.getState().open(options)
