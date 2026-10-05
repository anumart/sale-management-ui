import { IconLogout } from '@/components/icons'
import { Avatar, Dropdown, DropdownItem } from '@/components/ui'
import { confirm } from '@/stores/confirmStore'
import { toast } from '@/stores/toastStore'
import { useUiStore } from '@/stores/uiStore'
import { useMe } from '../api'

/** Avatar button + profile menu. Lives in the sidebar (desktop) / bottom bar (tablet). */
export function ProfileMenu() {
  const { data: me } = useMe()
  const closeMenu = useUiStore((s) => s.closeMenu)

  const logout = async () => {
    closeMenu()
    const ok = await confirm({ title: 'ออกจากระบบ?', message: 'คุณจะต้องเข้าสู่ระบบใหม่อีกครั้ง', confirmLabel: 'ออกจากระบบ', tone: 'primary' })
    if (!ok) return
    localStorage.removeItem('access_token')
    toast.info('ออกจากระบบแล้ว')
  }

  return (
    <Dropdown
      id="profile"
      placement="top-end"
      xlPlacement="right-end"
      className="w-72 p-2"
      trigger={(props) => (
        <button
          type="button"
          aria-label="เปิดเมนูโปรไฟล์"
          {...props}
          className="block size-14 overflow-hidden rounded-full border-[3px] border-white grad-accent shadow-card transition-shadow hover:shadow-[0_0_0_4px_var(--color-theme-soft)] aria-expanded:shadow-[0_0_0_4px_var(--color-theme-soft)] xl:size-[calc(var(--mk)*68)] xl:border-[calc(var(--mk)*3)]"
        >
          {me && <img src={me.avatarUrl} alt="" className="size-full object-cover" />}
        </button>
      )}
    >
      <div role="menu" aria-label="โปรไฟล์">
        {me && (
          <div className="mb-1.5 flex items-center gap-3 border-b border-line px-2.5 pt-2 pb-3.5">
            <Avatar src={me.avatarUrl} className="size-11" />
            <div className="min-w-0">
              <p className="truncate text-base font-medium">{me.name}</p>
              <p className="truncate text-sm text-muted">{me.role}</p>
            </div>
          </div>
        )}
        <DropdownItem icon={<IconLogout />} danger onClick={logout}>
          ออกจากระบบ
        </DropdownItem>
      </div>
    </Dropdown>
  )
}
