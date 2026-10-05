# Design Guide — sale-management-ui

This is the design system for this React app. Follow it whenever you build or change UI so new screens look like they belong to the same product.

- **Shared controls:** `src/components/ui`. Use them before writing new markup.
- **Tokens:** `src/styles/index.css` (`@theme`). Every token is a Tailwind utility.
- **Live reference:** run `npm run dev` and open **/ui-kit**. It shows every shared control.
- The design originally came from a static prototype (`index3.html`). This file is the React/Tailwind version of that guide.

---

## 1. Design principles

Direction: **premium fintech SaaS, Apple-inspired minimalism, soft glassmorphism.** Clean, calm, trustworthy.

1. **Calm canvas, glass surfaces.** The page is a blush off-white (`bg`) lit by soft orchid/mint gradients (fixed on `<html>`). Cards are translucent white `glass`; floating layers (sidebar rail, dropdowns, top-bar buttons) are frosted `glass-blur`. Modals, confirm dialogs and toasts are solid white (`bg-surface border border-line`) so they read clearly over the dimmed backdrop.
2. **Color only where it means something.** Saturated color is reserved for the primary action, the selected state, key numbers and data.
3. **Soft and rounded.** Cards have a ~24px radius, controls have 14px or pill radii, and icon buttons and avatars are circles. There are no sharp corners.
4. **Quiet elevation.** Shadows are low-contrast and layered (`shadow-card`, `shadow-pop`). Buttons don't lift on hover; they press (`scale-[0.97]`).
5. **Generous whitespace.** Cards use `p-6 xl:p-7` padding and table rows have 16px vertical padding. Don't crowd.
6. **Theme ≠ primary.** `theme` (orchid pink) is the brand: the active sidebar item, the active top-bar section tab (`SectionTabs`), the first summary card, the highlighted chart bar/slice, key amounts, the route progress bar and the page light. It never colors a control. Controls use intent colors instead, so a red button always means danger and is never confused with the pink brand.
7. **Intent colors for components.** `primary` (indigo) = the main action, selection, links, focus, checkboxes, pagination. `success` (mint green), `danger` (red), `warning` (orange), `info` (sky blue) = status and outcome. Mint `accent` is a decorative supporting color, never a CTA. Use only the palette tokens (theme, accent, primary, success, warning, info, danger, bg) — no extra hues.
8. **Use Tailwind utilities and the tokens below.** Don't use inline hex values, CSS modules or UI libraries. Icons are inline SVG components in `src/components/icons`.

---

## 2. Design tokens

Defined in `src/styles/index.css`. Use them as utilities, for example `bg-primary`, `text-muted`, `rounded-card`, `shadow-card`, `glass`.

| Token (utility suffix) | Value | Use |
|---|---|---|
| `bg` | `#f6eff3` (blush off-white) + corner washes: orchid top-left, mint top-right, yellow bottom-left, indigo bottom-right (10–22% alpha) | Page background (set on `<html>`) |
| `surface` | `#ffffff` | Solid white: inputs, pagination buttons, segmented thumb |
| `glass` / `glass-strong` / `glass-edge` | white 74% / 84% / 70% | Glass fills and the light 1px edge (used by the `glass` utilities) |
| `line` / `line-strong` | `rgb(60 60 67 / .10)` / `/ .22` | Dividers, table rows / input and outline-button borders |
| `fill` / `fill-strong` | `rgb(118 118 128 / .08)` / `/ .16` | Neutral fills: inactive nav buttons, button-group track / switch off-track |
| `hover` | `rgb(0 0 0 / .025)` | Row and list-item hover |
| `ink` / `ink-2` | `#1d1d1f` / `#3a3a3c` | Primary text / secondary text and form labels |
| `muted` / `placeholder` | `#6e6e73` / `#aeaeb2` | Captions, table headers (5.1:1 on white, 4.5:1 on `bg` — keeps light 300 text readable) / placeholders, faint meta |
| `dark` / `dark-hover` / `on-dark` | `#cccccc` / `#bdbdbd` / `#1d1d1f` | Neutral gray UI: active segmented item, dark button, sticky action bars. Text on it is ink, never white |
| `theme` / `theme-hover` / `theme-soft` / `theme-soft-hover` | `#e8457a` / `#e42563` / `#fce8ef` / `#fad6e2` | Brand identity only (see principle 6) |
| `primary` / `primary-hover` / `primary-fg` / `primary-fg-hover` / `primary-soft` / `primary-soft-hover` / `on-primary` | `#3d5afe` / `#2445f5` / `#3450ee` / `#2238c9` / `#ebf9ff` / `#e6f7ff` / white | Main action, selection, links, focus |
| `accent` / `accent-hover` / `accent-dark` / `accent-soft` / `on-accent` | `#00d4b4` / `#00b096` / `#077c6a` / `#e5fffb` / ink | Secondary highlight (mint). `accent-dark` is the text tone on white/`accent-soft`; text on an accent fill is ink (white is 1.9:1) |
| `success` · `-hover` · `-fg` · `-bg` · `-bg-hover` · `on-success` | `#34d399` · `#28bb85` · `#1b7e5a` · `#eafaf4` · `#d9f7ec` · ink | Positive, success, available, trend up |
| `danger` · `-hover` · `-fg` · `-bg` · `-bg-hover` · `on-danger` | `#f04438` · `#ed2517` · `#d11c10` · `#fde9e7` · `#fcd7d4` · white | Negative, destructive, error, trend down |
| `warning` · `-hover` · `-fg` · `-bg` · `-bg-hover` · `on-warning` | `#f79009` · `#d57c07` · `#a05e08` · `#fef4e6` · `#feebd3` · ink | Needs attention, pending |
| `info` · `-hover` · `-fg` · `-bg` · `-bg-hover` · `on-info` | `#0ba5ec` · `#098dca` · `#0975a7` · `#e7f7fe` · `#d3f0fd` · ink | Neutral information |
| `chart-3` / `chart-4` | `#f5d9a8` / `#d8d8de` | Extra data colors |
| `rounded-card` | 1.75rem | Cards, modals |
| `rounded-control` | 0.875rem | Buttons, inputs, selects |
| `shadow-card` | three soft layers | Cards, floating controls |
| `shadow-pop` | stronger soft layers | Dropdowns, autocomplete list, bottom bar |
| `shadow-modal` | large shadow | Modal, toast |
| `shadow-primary` | indigo glow | Primary button, current page |
| `shadow-theme` | orchid glow | Active sidebar item |
| `shadow-badge` | red glow | Count badge |

**Palette: "Orchid Mint".** Chosen from three options (Tropical Lagoon, Citrus Volt, Orchid Mint). Orchid pink brand (still a flower shop, fresher than the old red), mint accent, indigo primary. Each intent's tones are derived in HSL from its base: `-hover` is L −0.07, `-bg` / `-bg-hover` are L .95 / .91 at the same hue, and `-fg` is the lightest shade of the hue that reaches 4.6:1 on `-bg`.

**Which tone to use:**
- Solid fill → `bg-X` / `grad-X`, with text `text-on-X`. `on-X` is white where white reaches 3:1 (enough for medium-weight button labels and icons): `primary` (5.1:1) and `danger` (3.8:1). `success`, `warning`, `info`, `accent` and `dark` take ink. The theme stat card and active sidebar item use white on `theme` (3.8:1, large text/icons).
- Text or icon in the intent color on a light surface → `text-X-fg` (all ≥ 4.5:1 on white and on `X-bg`). Never `text-X`: the base colors are too light to read as text.
- Tinted background → `bg-X-bg`; borders can use the base (`border-danger`, `border-X/25`).

**Surface utilities**

| Utility | Use |
|---|---|
| `glass` | In-flow cards (`Card`, plain `StatCard`, detail panels). No `backdrop-filter`, on purpose: it would make every card a stacking context and trap dropdowns/popovers under the next card. |
| `glass-blur` | Floating layers only: sidebar rail, `Dropdown`, `Autocomplete` list, date popover, top-bar `IconButton`, chart tooltip. |

**Gradient fills.** Every solid fill of `theme` and of the intent/accent colors uses its gradient utility, not the flat `bg-*`:

| Utility | Runs (135°) |
|---|---|
| `grad-theme` | pink `#ff8aa8` → `theme` → magenta `#b8329a` |
| `grad-primary` | `#6b8bff` → `primary` → violet `#4a2fe0` |
| `grad-success` | `#6fe8b8` → `success` → teal `#10b9a0` |
| `grad-danger` | `#ff7a6b` → `danger` → crimson `#d92d5f` |
| `grad-warning` | `#ffc14d` → `warning` → `#e8630a` |
| `grad-info` | `#4fd1ff` → `info` → blue `#2563eb` |
| `grad-accent` | `#6ff5d8` → `accent` → `#0099c7` |
| `grad-dark` | same pattern for the supporting colors |

- The stops live in `:root` as `--grad-*` in `src/styles/index.css`; the utilities set the flat token as `background-color` fallback and `background-origin: border-box` (so a transparent border doesn't show a seam).
- No inner highlight on gradient fills.
- **Buttons never use gradients.** `Button` variants (and the current page in `Pagination`) are flat `bg-X` fills that swap to `bg-X-hover` on hover. Gradients are for other surfaces only (sidebar active item, stat cards, checkbox/chip/switch states, progress, badges).
- Soft tints (`*-soft`, `*-bg`), pills, opacity-modified fills (`bg-danger/10`) and hover backgrounds stay flat.
- `text-grad-theme` is gradient text for key brand amounts (Last Transaction). Use it sparingly.
- SVG data (donut) uses a `<linearGradient>` between two tokens, e.g. `theme` → `primary`; the legend dot uses the matching `--grad-*`.

**Data colors (charts and legends), in order:** `theme`, `accent`, `chart-3`, `chart-4`.

If you need a new color, add it to `@theme` first. Never scatter hex values through components.

---

## 3. Typography

- **Base size:** `html { font-size: 87.5% }` (1rem = 14px). Every Tailwind size scales from it, so write arbitrary sizes in `rem`, not `px` (hairline borders excepted).
- **Font:** `Inter` for Latin text and numbers, falling back per glyph to `Noto Sans Thai` for Thai. Both are loaded in `index.html` in weights 300/400/500/600/700.
- **Headings:** add `tracking-tight` to page, card and modal titles.
- **Weights:** 300 (light) for body copy, set on `body` in `index.css` — content, table cells, descriptions, captions and input text inherit it, so leave them unset (use `font-light`, not `font-normal`, to reset a `<th>` or other bold-by-default element). 500 for labels, list titles and buttons, 600 for card titles, modal titles and emphasized numbers.
- **Numbers:** use `tabular-nums` in tables and prices.

**Type scale.** It is compact, taken from the Orchid Mint preview's ratios and set at a 14px base. The custom sizes are defined in `@theme` in `index.css` and registered with tailwind-merge in `lib/cn.ts`; register any new size there too, or `cn()` treats it as a text color and drops it. Do not add `xl:` size bumps; one size per role.

| Token | Size | Role |
|---|---|---|
| `text-stat` | 2rem (28px) | Summary card value |
| `text-display` | 1.4625rem (20.5px) | Page title, modal title, hero amounts |
| `text-title` | 1.15rem (16px) | Card and section titles |
| `text-base` | 1rem (14px) | Body, list item titles, summary card label |
| `text-body` | 0.9625rem (13.5px) | Table cells, list row text |
| `text-control` | 0.925rem (13px) | Buttons (md), tabs, labels, links, subtitles |
| `text-sm` | 0.875rem (12.25px) | Captions, meta, table headers, pills, small buttons |

| Role | Classes |
|---|---|
| Page title (`Topbar`) | `text-display font-medium tracking-tight` |
| Page subtitle | `text-control text-muted` |
| **Card title (`CardHeader`)** | `text-title font-semibold tracking-tight`, the same on every card |
| Card subtitle | `text-control text-muted` |
| Section title inside a card | `text-title font-semibold` |
| Summary card title | `text-base font-semibold truncate` |
| Summary card value | `text-stat font-medium tracking-tight` |
| Summary card caption | `text-sm` |
| List item title | `text-base font-medium` |
| Table cell | `text-body` (set on the `<table>`) |
| Table header | `text-sm font-semibold text-muted` |
| Labels | `text-control font-medium text-ink-2` |
| Captions, meta text | `text-sm text-muted` |

Always use `CardHeader` for card titles so every title stays the same size.

---

## 4. Layout

### 4.1 App shell (`src/components/layout`)
```
AppLayout  grid: [84px sidebar | 1fr main]   (xl and up)
├── Sidebar      sticky rail (xl+) / floating bottom bar (< xl)
├── main
│   ├── <Topbar />   rendered by each page (logo `/logo-e33f4f-v2.png` h-16 + optional section tabs + circle action buttons; STICKY full-bleed bar (`top-0 z-[45]`) that turns frosted white `bg-white/85 backdrop-blur-xl` + bottom border/shadow once the window scrolls; page title/subtitle on a row below scrolls with the content)
│   └── page content
├── <ConfirmHost />  (global confirm box)
└── <Toaster />      (global toasts)
```

### 4.2 Breakpoints
| Width | Behavior |
|---|---|
| **xl ≥ 1280px** (desktop) | Left sticky sidebar rail with nav and avatar (no logo; the brand logo is in the Topbar). Three regions: the header band (Topbar logo row only: logo + tabs + message/notification buttons) across the full width — on xl the Topbar `<header>` is pulled left over the sidebar column (`xl:ml-[calc(var(--mk)*-164)]` = rail 106mk + gap 58mk) so the logo lines up with the rail's left edge; below it the sidebar column (sticky nav rail + avatar pinned to the bottom) and the main column, which starts with the page title row. The rail starts at `--header-h` (index.css, 5.5rem = h-16 logo + mb-6), level with the page title. If the logo row height changes, update `--header-h`. 4 summary cards in one row. |
| **lg 1024–1279px** | **Bottom bar** replaces the sidebar. Summary cards go 2×2. Chart row is 50/50. Table and form stack. |
| **< 1024px** (tablet portrait) | Every content row is a single column. The table hides its ID column. |

The bottom bar is a floating frosted-glass pill (`glass-blur`) at the bottom center (`fixed bottom-5`). Menus that open from it open **upward**. `AppLayout` adds `pb-36` so content isn't hidden behind the bar.

### 4.3 Grids
- **Gap:** `gap-4` between cards (rows and columns).
- **Summary row:** `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`.
- **Wide + narrow** (chart + donut, table + form): `xl:grid-cols-[1147fr_572fr]`.
- **Balanced** (lists): `lg:grid-cols-[818fr_901fr]`, or `grid-cols-2`.
- Card roots are `min-w-0` so grid columns can shrink. Truncate long single-line text with `truncate` instead of letting it wrap and break the layout.

---

## 5. Components (`src/components/ui`)

Import from the barrel: `import { Button, Card, TextField } from '@/components/ui'`.

| Component | Use |
|---|---|
| `Card`, `CardHeader`, `CardLink` | White card, title row (title / subtitle / action), "See All" link |
| `DataTable` | **The shared implementation of every list/data table below — always use it for a new table, never hand-roll `<table>` markup for one.** Generic over the row type; takes `columns` (each with `render`, and `sortValue` unless `sortable: false`), `rows`, `rowKey`. Client mode (default): give `pageSize` for pagination and/or nothing for sort — the table manages its own state. Server mode: pass `sort`+`onSortChange` and a `pagination` object together — the table then expects `rows` to already be the current page, pre-sorted. `selected`+`onSelectedChange`+`bulkActions` turn on the checkbox column (Data table variant); `renderActions` adds the trailing row-actions column (Simple list table variant). `emptyIcon`/`emptyTitle`/`emptyDescription` feed the built-in `EmptyState`. Small nested tables tied to fixed wizard/modal state (per-row `TextField`/`Select` inputs, conditional columns) are the one exception — those still hand-write `<table>` (see the **Tables** rule below), but still follow its boxed-row styling by hand. Reference migrations: `PropertyTable.tsx` (server mode + selection), `SuppliersListPage.tsx` (client mode + row actions). |
| `EmptyState` | Placeholder graphic for `DataTable`'s built-in empty row (rarely used standalone). Always renders the same `IconNoData` illustration (folded document + text lines + magnifying glass + X badge, flat, built from `--color-primary` at varying opacity — no new hex colors, no per-table icon swap). Only `title`/`description` vary by subject (e.g. "No suppliers found" / "Add a supplier to get started."). |
| `Button` | `variant`: primary · success · warning · info · accent · dark · soft · outline · ghost · danger. `size`: sm · md · lg. `iconOnly`, `round`, `loading`, `outlined` (outline version of the variant's color). Pill-shaped (`rounded-full`) by default; an `iconOnly` button (e.g. a table row action) instead gets 14px radius, staying square unless `round` is also passed for a circle. |
| `IconButton` | 56px frosted-glass (`glass-blur`) circle in the top bar, with an optional `count` badge |
| `TextField` | Textbox with `label`, `required`, `error`, `hint`, `prefix` |
| `TextArea`, `Select` | Same look and API as `TextField` (Select is a styled native `<select>`) |
| `Autocomplete` | Combobox with keyboard navigation. Data comes from outside: `inputValue` + `options` + `loading` from a React Query hook fed with a debounced value. |
| `Checkbox` | Custom 20px box with `indeterminate` support |
| `Switch` | On/off toggle; the track is `accent` when on |
| `ChipGroup` | Single-choice pill chips |
| `SegmentedControl` | `variant="dark"` (pill, black active) for filters and tabs; `variant="light"` (gray track) for button groups |
| `Modal` | Portal dialog: `icon` + `tone`, `centered`, `footer`, `size`. Handles Esc, backdrop click, scroll lock and focus in/out. |
| `ConfirmDialog` | Centered confirm box. **Every destructive action goes through it.** |
| `confirm()` | Imperative version: `if (await confirm({ title, tone: 'danger' })) …` (rendered by `ConfirmHost`) |
| `toast.success/error/info()` | Dark toast at the bottom-right (rendered by `Toaster`) |
| `Dropdown`, `DropdownItem` | Popover menu. Only **one open at a time**, tracked by `useUiStore`. Closes on outside click and Esc. |
| `Pagination` | `‹ 1 … 4 5 6 … 12 ›` |
| `StatusPill` | Rectangular status label (`text-sm font-medium`). Tones: primary · success · warning · info · danger · accent · neutral. Colors match `Button outlined` of the same intent: full-strength `border-X`, `text-X-fg` (accent: `text-accent-dark`), soft `X-bg` fill (primary: `primary-soft`, accent: `accent-soft`); neutral is white with `border-line-strong` and `text-ink-2`, like the gray row action. |
| `DeltaBadge`, `CountBadge` | ▲20% / ▼10% change badge; red (`grad-danger`) count bubble |
| `Avatar`, `Spinner`, `Skeleton` | Small helpers |
| `InitialsAvatar`, `AvatarGroup` | Avatar that falls back to gradient initials; overlapping group with a "+N" counter |
| `Tabs` | Tab list + panel. `variant="pill"` (gray track, white thumb) or `"line"` (primary underline). Arrow keys move between tabs |
| `Accordion` | Disclosure rows split by hairlines; `type` single · multiple |
| `Alert` | Inline callout: tint `X-bg`, border `X/40`, icon `text-X-fg`. Tones: primary · success · warning · info · danger · neutral; optional `action` |
| `RadioGroup` | Single choice with a primary dot; `variant="card"` turns each option into a bordered tile with a description |
| `Toggle`, `ToggleGroup` | Pressed state is `primary-soft` / `primary-fg`; `outline`, `single`. For a required single choice use `SegmentedControl` |
| `Progress`, `Slider` | Progress fills with the tone's `grad-*`; slider track fills with `primary` |
| `Tooltip` | CSS-only ink label on hover/focus, `side` top · bottom · left · right |
| `Popover` | Self-contained `glass-blur` panel (not tied to `useUiStore`), closes on outside click / Esc |
| `Sheet` | Side panel (`side` left · right) in a portal with backdrop, Esc and scroll lock |
| `InputOTP` | Digit boxes with auto-advance, backspace, arrow keys and paste; `separatorAfter`, `invalid` |
| `Breadcrumb`, `Separator`, `Kbd` | Path trail (last item = current page); hairline divider; keyboard key hint |

### Component rules
- **Buttons:** one `primary` button per area. The secondary action is `outline`. Destructive actions are `danger` and go through the confirm box. Icon-only buttons need an `aria-label`.
- **Forms:** two-column grid (`sm:grid-cols-2`), full-width fields use `sm:col-span-2`. Actions sit right-aligned below a divider: outline Reset/Cancel, then primary Save.
- **Validation:** show errors under the field (`error` prop) and clear them as the user types.
- **Status pills:**

  | Status | Tone |
  |---|---|
  | Available | `success` |
  | Pending | `warning` |
  | Sold / info | `info` |
  | Rejected | `danger` |

- **Summary cards** (`features/dashboard/components/StatCard`): all four are solid palette colors — `theme`, `accent`, `primary`, `warning` — with the decorative graphics `stat-deco-rings`, `-waves`, `-dots`, `-rings`. Text uses each token's `on-*` color (ink on accent and warning). A `plain` glass variant is still available.
- **Tables (applies to every table in the app that displays data — "data table" means any of them, not one specific component):** use the shared `DataTable` component (§5) for any real list/data table — it already implements every rule in this section. The rules below exist so (a) you know what `DataTable` is doing and why, and (b) you can hand-implement the same styling for the few small nested tables (wizard steps, modals, per-stop loops) that don't fit `DataTable`'s column model. No outer border around the whole `<table>`, no header background, and no divider *shared* between two adjacent rows. Every table uses `<table className="w-full border-separate text-body [border-spacing:0_0.5rem]">`, and every row is its own rounded "card": each `<td>` gets `border-y border-line`, the first `<td>` in the row adds `border-l rounded-l-[0.875rem]`, the last adds `border-r rounded-r-[0.875rem]`, and `border-spacing` gaps the rows apart — since each row's border is independent (not a shared line with its neighbor), this is not a "row divider" and is mandatory, not optional polish. Hovered rows get `hover:bg-[#fafafa]`; numeric columns use `tabular-nums`; cell padding is `px-3.5 py-4`. Loading and empty states render as a single full-width row (`colSpan`) styled `rounded-[0.875rem] border border-line py-12` (or `py-16` with a `Spinner` while loading). The boxed-row treatment applies to every `<table>` regardless of size or context — including small nested tables inside a modal (`SupplierOrderModal.tsx`), a wizard step (`NewPlanStep1Page.tsx`, `NewPlanStep2Page.tsx`) or a per-stop loop (`RecordReceiptPage.tsx`, `RunSheetDetailPage.tsx`, `GenerateRunSheetPage.tsx`); the padding/font-size can shrink to fit a tight nested space (e.g. `text-sm`, `py-1.5`), but the `border-separate`/per-row-border/rounded-corner structure never gets dropped. (The **Sorting** rule below is judged independently per table — a small data-entry table tied to fixed wizard/modal state may reasonably skip sortable headers even though it must still use the boxed-row style.) Two variants, which differ only in bulk-select, not in row framing (both use the boxed-row style above):
  - **Data table** — full CRUD list with search, filter, sort, select and bulk actions. The first column is a `Checkbox` in a `w-11` header cell (header checkbox selects/clears the current page, with `indeterminate` when partially selected); selected rows get `bg-primary-soft` instead of the hover tint; the checkbox `<td>` uses `pr-1.5 pl-3.5` padding instead of `px-3.5`. A row's leading identity column commonly pairs a `size-8 rounded-full bg-primary-soft text-sm font-semibold text-primary-fg` circular initial/icon with the name (see `PropertyTable.tsx`'s Property column); a plain numbering column zero-pads with `.padStart(2, '0')`. When `selected.size > 0`, a `primary-soft` bar (`rounded-control bg-primary-soft px-4 py-2.5`) appears above the table with a count and Clear/Delete-selected buttons. Reference: `features/properties/components/PropertyTable.tsx` (also embedded on the Dashboard).
  - **Simple list table** — read-only rows for lists that don't need bulk operations or reordering (e.g. `features/procurement/PlansListPage.tsx`, `PurchaseOrdersPage.tsx`, `logistics/VehiclesListPage.tsx`, `RunSheetsListPage.tsx`, `procurement/SuppliersListPage.tsx`, `SupplierDetailPage.tsx`, `PlanDetailPage.tsx`). Same boxed-row styling and the same sortable-header pattern as Data table (see **Sorting** below) — the only difference from Data table is no `Checkbox` column and no bulk-select action bar. The last column holds per-row actions instead of row selection.
  - **Row actions (mandatory):** every per-row action — whether the row has one or several — renders as an icon-only, outlined `Button` (`size="sm" iconOnly outlined`), right-aligned in a `flex justify-end gap-1.5` container, one icon per action, each with `aria-label` + `title` describing it. `outlined` is required: row actions are never solid fills, so a table full of rows stays calm. It draws the variant's color as a 1px border + colored icon on white, tinted on hover. Each action gets its own color by semantic meaning (pick the `variant`; never `variant="outline"`): neutral/read actions (View → `IconEye`, Manage → e.g. `IconUsers`) use `variant="soft"`, which renders as a neutral gray outline; the forward/positive step in a workflow (Send → `IconArrowUpRight`, Activate → `IconPower`) uses `variant="accent"`; a confirming step (Mark confirmed → `IconCheck`) uses `variant="primary"`; destructive/reversing actions (Cancel, Deactivate/Delete → `IconTrash`) use `variant="danger"`. A toggle action also swaps its icon with its state (e.g. Activate/Deactivate shows `IconPower` when activating, `IconTrash` when deactivating). Never use a labeled text `Button` for a table row action. Reference: the row actions in `PurchaseOrdersPage.tsx`, `PlansListPage.tsx`, `VehiclesListPage.tsx`, `RunSheetsListPage.tsx`, `SuppliersListPage.tsx`, `SupplierDetailPage.tsx`, `PlanDetailPage.tsx`, `LinesPage.tsx`, `ProductionOrdersPage.tsx`, `FinishedGoodsPage.tsx`.
  - **Sorting (mandatory on every table, both variants — every data column must be sortable, not just some):** the `<th>` has no visible border/background — the whole header cell is a `<button type="button">` wrapping the label and a 16×16 `IconSort dir={dir} className="size-4"`. `IconSort` draws two chevrons (up + down) and fades the *inactive* direction to `opacity: 0.2` via its `dir` prop — never swap in a different icon per direction. Header text/icon color: `text-muted` when the column isn't the active sort, `text-ink` when it is; both use `inline-flex items-center gap-1.5 text-base`. The `<th>` itself sets `aria-sort` to `"ascending" | "descending" | "none"` from the same state. Clicking cycles a single shared `{ key, dir }` state: a new column → `asc`; the already-active column toggles `asc ↔ desc`; only one column is ever sorted at a time. A trailing actions-only column has a header `<th>` with no button/label. Reference: `features/properties/components/PropertyTable.tsx` (`toggleSort`) and `features/procurement/PlansListPage.tsx`/`PurchaseOrdersPage.tsx` — all four implement the identical pattern, copy it exactly rather than inventing a new one.
  - **Pagination (mandatory whenever a list can exceed one page):** always the shared `Pagination` component (`‹ 1 … 4 5 6 … 12 ›`, `src/components/ui/Pagination.tsx`) — never hand-build page-number buttons. It renders in a `<footer className="mt-5 flex flex-wrap items-center justify-between gap-4 text-control text-muted">` below the table: a left-aligned `"Showing {start+1}–{end} of {total}"` summary (plus an optional `"Rows per page"` native `<select>` when page size is user-adjustable, styled `h-9 rounded-lg border border-line bg-surface px-2 text-ink`) paired with `<Pagination page={Math.min(page, pageCount)} pageCount={pageCount} onChange={setPage} />` on the right. `pageCount = Math.max(1, Math.ceil(total / size))`; always clamp `page` into range when computing rows so a filter change that shrinks the list can't strand the view on an empty page. A short list that can never exceed one page may omit pagination entirely, but if it's shown, this exact footer layout and the shared component are required — no custom prev/next controls. Reference: `PropertyTable.tsx` (server-paginated, with page-size selector) and `PlansListPage.tsx` (client-side slicing, fixed page size).
- **Charts:** inactive bars use `bar-stripes`, and the highlighted bar is solid `theme` with an amber dot and a `glass-blur` tooltip. The donut uses SVG `stroke-dasharray` with small gaps.
- **Top bar:** sticky full-width band, frosted white once the page scrolls. The logo (and section tabs) are on the left and circle `IconButton`s are on the right, with red `CountBadge`s. The profile menu lives **only** on the sidebar avatar, never in the top bar.

---

## 6. Icons
- Add icons to `src/components/icons/index.tsx`. They are 24×24, `stroke="currentColor"`, with round caps.
- **Size:** set it with Tailwind (`className="size-5"`).
- **Color:** comes from `text-*` on the icon or its parent.
- **Typical sizes:** `size-6` in nav and the top bar, `size-5` in buttons and menus, `size-4` in small buttons.

---

## 7. Interaction and accessibility
- **Hover:** a light tint (`primary-soft`, `#fafafa`) or a darker fill for solid buttons. Transitions are about 150ms.
- **Focus:** a visible ring. Inputs use `shadow-[0_0_0_4px_var(--color-primary-soft)]`; everything else uses the global `:focus-visible` outline.
- **Popups:** menus and dialogs set `aria-expanded`, `aria-haspopup`, `role="dialog"` and `aria-modal`. Put dynamic counts in labels, for example "Notifications, 3 unread".
- **Loading:** use `Skeleton` for first load. Keep the previous data while refetching (`placeholderData`) and fade it slightly.

---

## 8. Do and don't

**Do**
- Reuse `src/components/ui` and the tokens. Extend a shared component instead of copying its markup.
- Put feature-specific components in `src/features/<feature>/components`.
- Test at 1920, 1024 and 768px wide.

**Don't**
- Don't add gradients, patterns or grain to the page background.
- Don't introduce a second primary color, and don't use green or red for decoration.
- Don't use sharp corners, heavy borders or dark shadows.
- Don't add a second sticky/fixed header: the `Topbar` logo row is the one sticky top bar (frosted once scrolled); the page title row and `PageHeading` scroll with the content.
- Don't duplicate a control in two places (for example, the profile menu in both the top bar and the sidebar).
- Don't add a UI component library or an icon font.
