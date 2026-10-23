/**
 * Icon set. Most icons come from Iconsax (`iconsax-react`, Linear variant — see DESIGN.md §7)
 * re-exported here under our own names so every consumer keeps importing from '@/components/icons'
 * and nothing outside this file needs to know which icon pack is behind a given name.
 *
 * A handful stay hand-drawn inline SVG because Iconsax has no faithful equivalent:
 *  - IconClose / IconCheck: Iconsax only ships "close/tick in a circle or square". We render these
 *    bare (no frame) inside our own colored circular badges (Modal close button, Toaster icons,
 *    icon-only buttons) — a framed glyph on top of our own frame would double up.
 *  - IconSort: a compound two-arrow sort-direction indicator with per-arrow opacity, specific to
 *    DataTable's `dir` prop — not a stock icon.
 *  - IconPower / IconWrench / IconFan / IconPlumbing: no on/off-power, spanner, ceiling-fan or
 *    plumbing-pipe glyph exists in the set; forcing a mismatched substitute (e.g. a gear for
 *    "plumbing") would be less clear than the hand-drawn original.
 *  - IconNoData: a composite illustration (not a single glyph) for the shared empty-state graphic.
 *
 * Size with Tailwind either way: <IconBell className="size-6" />
 */
import {
  Add,
  ArrowDown,
  ArrowDown2,
  ArrowLeft2,
  ArrowRight2,
  ArrowUp,
  Box,
  Buildings,
  Buildings2,
  Calendar,
  Call,
  Card,
  Category,
  Chart,
  Colorfilter,
  Crown,
  DirectInbox,
  DocumentDownload,
  Edit2,
  Eye,
  ExportSquare,
  Flash,
  Heart,
  Home,
  InfoCircle,
  Location,
  Logout,
  Message,
  MessageQuestion,
  Money3,
  More,
  Notification,
  People,
  Printer,
  Profile,
  ReceiptText,
  SearchNormal1,
  Setting2,
  ShoppingBag,
  ShoppingCart,
  Timer1,
  Trash,
  TrendDown,
  TrendUp,
  Truck,
  Wallet,
  Warning2,
  type IconProps as IconsaxIconProps,
} from 'iconsax-react'
import type { ComponentType, ReactNode, SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement> & { strokeWidth?: number }

function Icon({ children, strokeWidth = 1.6, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

/**
 * Decorative by default (screen readers skip these); pass aria-hidden={false} / aria-label to override.
 * Also sets iconsax-react's own defaults ourselves: the package assigns them via `Component.defaultProps`,
 * which React 19 no longer honors on function components, so without this every icon renders with no
 * stroke color at all (invisible).
 */
function decorative(IconsaxIcon: ComponentType<IconsaxIconProps>) {
  return (p: IconsaxIconProps) => (
    <IconsaxIcon variant="Linear" color="currentColor" size="24" aria-hidden="true" focusable="false" {...p} />
  )
}

export const IconDashboard = decorative(Category)
export const IconCard = decorative(Card)
export const IconChart = decorative(Chart)
export const IconBuilding = decorative(Buildings)
export const IconUsers = decorative(People)
export const IconUser = decorative(Profile)
export const IconCalendar = decorative(Calendar)
export const IconSettings = decorative(Setting2)
export const IconHelp = decorative(MessageQuestion)
export const IconLogout = decorative(Logout)
export const IconMessage = decorative(Message)
export const IconBell = decorative(Notification)
export const IconPalette = decorative(Colorfilter)
export const IconSearch = decorative(SearchNormal1)
export const IconPlus = decorative(Add)
export const IconChevronDown = decorative(ArrowDown2)
export const IconChevronLeft = decorative(ArrowLeft2)
export const IconChevronRight = decorative(ArrowRight2)
export const IconTrendUp = decorative(TrendUp)
export const IconTrendDown = decorative(TrendDown)
export const IconMore = decorative(More)
export const IconTrash = decorative(Trash)
export const IconEdit = decorative(Edit2)
export const IconDownload = decorative(DocumentDownload)
export const IconArrowUpRight = decorative(ExportSquare)
export const IconHeart = decorative(Heart)
export const IconInfo = decorative(InfoCircle)
export const IconWarning = decorative(Warning2)
export const IconHome = decorative(Home)
export const IconCrown = decorative(Crown)
export const IconMoneyBag = decorative(Money3)
export const IconList = decorative(ShoppingBag)
export const IconBolt = decorative(Flash)
export const IconFactory = decorative(Buildings2)
export const IconWallet = decorative(Wallet)
export const IconPhone = decorative(Call)
export const IconClock = decorative(Timer1)
export const IconBox = decorative(Box)
export const IconReceipt = decorative(ReceiptText)
export const IconCart = decorative(ShoppingCart)
export const IconTruck = decorative(Truck)
export const IconMapPin = decorative(Location)
export const IconArrowUp = decorative(ArrowUp)
export const IconArrowDown = decorative(ArrowDown)
export const IconPrinter = decorative(Printer)
export const IconEye = decorative(Eye)
export const IconInbox = decorative(DirectInbox)

/** Hand-drawn — see file header for why. */
export const IconClose = (p: IconProps) => (
  <Icon strokeWidth={2} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)
export const IconCheck = (p: IconProps) => (
  <Icon strokeWidth={2} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
)
export const IconSort = ({ dir, ...p }: IconProps & { dir?: 'asc' | 'desc' }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M4.5 6 8 2.5 11.5 6" opacity={dir === 'desc' ? 0.2 : 1} />
    <path d="M4.5 10 8 13.5 11.5 10" opacity={dir === 'asc' ? 0.2 : 1} />
  </svg>
)
export const IconPower = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v7" />
    <path d="M7 6.5a7 7 0 1 0 10 0" />
  </Icon>
)
export const IconWrench = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z" />
  </Icon>
)
export const IconFan = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4" width="17" height="8" rx="2" />
    <path d="M3.5 9h17M8 14c0 2-1.5 2-1.5 4s1.5 2 1.5 3M12 14v7M16 14c0 2 1.5 2 1.5 4s-1.5 2-1.5 3" />
  </Icon>
)
export const IconPlumbing = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 6h6M6 6v4M3 10h14a2 2 0 0 1 2 2v2M3 14h10M13 10v4M19 16.5v.01M17.5 19.5v.01M20.5 19.5v.01" />
  </Icon>
)

/** Flat "no data" illustration — folded document + lines, magnifying glass, X badge. The shared EmptyState graphic. */
export const IconNoData = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false" {...p}>
    <rect x="8" y="30" width="22" height="20" rx="4" fill="var(--color-primary-soft)" />
    <path d="M19 8H37L46 17V47Q46 50 43 50H19Q16 50 16 47V11Q16 8 19 8Z" fill="var(--color-primary)" fillOpacity="0.14" />
    <path d="M37 8 46 17H37Z" fill="var(--color-primary)" fillOpacity="0.28" />
    <rect x="22" y="19" width="16" height="2.4" rx="1.2" fill="var(--color-primary)" fillOpacity="0.4" />
    <rect x="22" y="26" width="16" height="2.4" rx="1.2" fill="var(--color-primary)" fillOpacity="0.4" />
    <rect x="22" y="33" width="12" height="2.4" rx="1.2" fill="var(--color-primary)" fillOpacity="0.4" />
    <rect x="22" y="40" width="9" height="2.4" rx="1.2" fill="var(--color-primary)" fillOpacity="0.4" />
    <circle cx="44" cy="41" r="7" stroke="var(--color-primary)" strokeOpacity="0.45" strokeWidth="3.4" />
    <path d="M49 46 55 52" stroke="var(--color-primary)" strokeOpacity="0.45" strokeWidth="3.4" strokeLinecap="round" />
    <circle cx="18" cy="15" r="8" fill="var(--color-primary)" />
    <path d="M14.5 11.5 21.5 18.5M21.5 11.5 14.5 18.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
)
