/**
 * Decorative photo layer behind the whole app, mounted once in `AppLayout` (so every route and nested layout gets it).
 * It only paints `--page-image`, which a `html[data-bg='…']` block in index.css sets for photo backgrounds; with no image
 * set it paints nothing and the gradient on <html> shows through. The after: veil (`--page-veil`, set only with an image) softens the photo under the glass cards. Static markup: no state, never re-renders.
 * Fixed + negative z-index keeps it stationary behind all content, and pointer-events-none lets every click through.
 */
export function AppBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 bg-[image:var(--page-image,none)] bg-cover bg-[position:var(--page-image-position,center_center)] bg-no-repeat select-none after:absolute after:inset-0 after:bg-[var(--page-veil,transparent)]"
    />
  )
}
