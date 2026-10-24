import { IconPalette } from '@/components/icons'
import { Dropdown, IconButton } from '@/components/ui'
import { cn } from '@/lib/cn'
import { backgrounds, glassStyles, themeColors, useAppearanceStore } from '@/stores/appearanceStore'

/** Top-bar button + panel for choosing the page background gradient, the glass surface style and the theme color. */
export function AppearanceMenu() {
  const { background, glass, theme, setBackground, setGlass, setTheme } = useAppearanceStore()

  return (
    <Dropdown
      id="appearance"
      className="w-[21rem] max-w-[calc(100vw-48px)]"
      trigger={(props) => <IconButton icon={<IconPalette />} aria-label="ปรับธีมและพื้นหลัง" {...props} />}
    >
      <div role="dialog" aria-label="ธีมและพื้นหลัง" className="flex flex-col gap-5 p-5">
        <section>
          <h4 className="mb-3 text-control font-semibold">พื้นหลัง</h4>
          <div className="grid grid-cols-4 gap-2.5" role="radiogroup" aria-label="พื้นหลัง">
            {backgrounds.map((b) => (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={background === b.id}
                onClick={() => setBackground(b.id)}
                className="flex min-w-0 flex-col items-center gap-1.5"
              >
                <span
                  className={cn(
                    'block h-12 w-full rounded-xl border border-white/60 transition-shadow duration-200',
                    background === b.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-white/70' : 'hover:shadow-pop',
                  )}
                  style={{ backgroundImage: `linear-gradient(120deg, ${b.colors.join(', ')})` }}
                />
                <span className={cn('text-xs', background === b.id ? 'font-semibold' : 'text-muted')}>{b.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-control font-semibold">สีธีม</h4>
          <div className="grid grid-cols-5 gap-2.5" role="radiogroup" aria-label="สีธีม">
            {themeColors.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={theme === t.id}
                onClick={() => setTheme(t.id)}
                className="flex min-w-0 flex-col items-center gap-1.5"
              >
                <span
                  className={cn(
                    'block h-10 w-full rounded-xl border border-white/60 transition-shadow duration-200',
                    theme === t.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-white/70' : 'hover:shadow-pop',
                  )}
                  style={{ backgroundImage: `linear-gradient(135deg, ${t.colors.join(', ')})` }}
                />
                <span className={cn('text-xs', theme === t.id ? 'font-semibold' : 'text-muted')}>{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-control font-semibold">สไตล์กระจก</h4>
          <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="สไตล์กระจก">
            {glassStyles.map((g) => (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={glass === g.id}
                onClick={() => setGlass(g.id)}
                className={cn(
                  'rounded-xl border px-3.5 py-2.5 text-left transition-colors duration-200',
                  glass === g.id ? 'border-primary bg-primary-soft text-primary-fg' : 'border-line hover:bg-fill',
                )}
              >
                <span className="block text-control font-semibold">{g.label}</span>
                <span className="block text-xs text-muted">{g.hint}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </Dropdown>
  )
}
