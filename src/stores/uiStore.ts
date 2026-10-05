import { create } from 'zustand'

/** Ids of popover menus. Only one can be open at a time. */
export type MenuId = 'notifications' | 'profile'

interface UiState {
  openMenu: MenuId | null
  toggleMenu: (id: MenuId) => void
  closeMenu: (id?: MenuId) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  openMenu: null,
  toggleMenu: (id) => set({ openMenu: get().openMenu === id ? null : id }),
  // Closing a specific id is ignored if another menu has taken over
  closeMenu: (id) => {
    if (!id || get().openMenu === id) set({ openMenu: null })
  },
}))
