# 002 — Restore the purple HeroUI theme and simplify the header

Written against commit `452e482`.

Implemented in `438d1b8`.

## Why this matters

HeroUI's stylesheet applies a light default before React runs. Stillroom reads the
saved preference in `useEffect`, so dark mode appears only after first paint. The
HeroUI migration also deleted the established purple token map. Separately, list
mode survives in four layers even though the product now has one masonry layout,
and the Tabs list inherits HeroUI's full-width flex stretching.

## Established token source

The approved pre-migration purple values are in commit `9658cb5`,
`apps/web/src/styles.css:9-76`:

```css
/* light */
--primary: oklch(0.496 0.265 301.924);
--primary-foreground: oklch(0.977 0.014 308.299);

/* dark */
--primary: oklch(0.438 0.218 303.724);
--primary-foreground: oklch(0.977 0.014 308.299);
```

Map these values to HeroUI's semantic `--accent`, `--accent-foreground`, and
`--focus` tokens rather than reintroducing Shadcn variables or components.

## Files in scope

- `apps/web/src/routes/__root.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/features/library/library-page.tsx`
- `apps/web/src/features/library/library-toolbar.tsx`
- `apps/web/src/features/library/media-gallery.tsx`
- `apps/web/src/features/library/library-command-palette.tsx` only if theme state
  types move to a shared module
- `design-system/stillroom/MASTER.md`
- New theme and layout regression tests

## Files explicitly out of scope

- Replacing HeroUI or HeroUI Pro components
- Sidebar, search, titles, or card metadata
- Loading skeleton implementation
- Drive/server code

## Implementation steps

1. Move `ThemePreference`, resolution, persistence, and DOM application into a
   small shared theme module. The `d` shortcut and command palette must continue
   using the same state owner. Ignore key events from inputs, textareas, selects,
   contenteditable elements, modified events, repeats, and prevented defaults.

2. Add a tiny blocking theme bootstrap script in `<head>` before styles paint.
   It must read `stillroom-theme`, resolve `system` through `matchMedia`, and set
   both `document.documentElement.dataset.theme` and the `.dark` class. Add
   `suppressHydrationWarning` to `<html>` because the script intentionally mutates
   theme attributes before hydration. The script must contain no secret or user
   content and must fail safely to `system`.

3. Initialize React theme state from the already-applied document/localStorage
   value rather than always rendering `system` first. Keep listening for system
   changes only while the preference is `system`.

4. After `@heroui/styles`, define paired `:root` and `.dark, [data-theme="dark"]`
   overrides using HeroUI semantic variables. Restore the purple values above as
   `--accent`; set `--focus: var(--accent)`. Translate the former neutral canvas,
   surface, overlay, default, muted, separator, field, and danger roles to the
   corresponding HeroUI tokens. Do not alter generated HeroUI component classes.

5. Remove list mode completely:
   - Delete `GalleryLayout`.
   - Delete `layout` state, localStorage reads/writes, and layout props.
   - Remove grid/list icons and the Gallery layout `Segment` from the header.
   - Remove `data-layout` and list selectors from the media gallery/CSS.
   - Remove `stillroom-layout` behavior; no migration is needed because the value
     becomes inert client storage.

6. Make the All/Folders tab list content-sized while leaving panels full width.
   Use `Tabs.ListContainer`'s documented `render` prop to supply a dedicated
   Stillroom DOM composition element with `width: fit-content; max-width: 100%`.
   Put the layout class on that custom element, not on a HeroUI component prop.
   Keep `Tabs.Panel` in the full-width Tabs root and preserve tab semantics.

7. Update `design-system/stillroom/MASTER.md`: header ends with only the theme
   segment; gallery is cards-only masonry; the HeroUI accent is the established
   purple token map; tabs are content-sized.

8. Add tests for theme resolution and DOM application. Add a Playwright test that
   seeds dark preference before navigation, loads the app, and observes the root
   element from the first executable page script; it must never expose a light
   `data-theme` value. Add static assertions that Gallery layout controls and List
   view are absent and both tabs remain visible.

## Per-step verification

```bash
rg -n "GalleryLayout|stillroom-layout|List view|data-layout" apps/web/src
rg -n "<[^>]+className=.*" apps/web/src/features/library apps/web/src/routes
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
```

Expected: the first search returns no matches; any second-search matches belong
only to native/custom DOM elements, never HeroUI components; typecheck/tests pass.

Then run:

```bash
bun run --cwd apps/web e2e
bun run --cwd apps/web build
```

## Done criteria

- A saved dark preference is applied before first paint on direct loads and reloads.
- `system` follows OS changes; explicit light/dark do not.
- HeroUI accent, selected tabs, focus, and primary actions use the restored purple.
- Header contains breadcrumbs and the theme segment only.
- No list-mode type, state, icon, persistence, prop, attribute, copy, or CSS remains.
- All/Folders tab chrome fits its contents at every viewport; its panel remains
  full width.
- No HeroUI component receives a custom `className`.

## Escape hatches

- If CSP blocks the inline bootstrap script in the deployment target, stop and add
  a nonce-aware external bootstrap asset or a server-readable theme cookie. Do not
  accept a post-hydration effect as the fallback.
- If the Tabs `render` prop changes selection semantics or generated IDs, stop and
  retain the HeroUI DOM while applying fit-content through a surrounding Stillroom
  composition. Do not target `.tabs__*` generated classes in application CSS.

## Maintenance note

Any future palette change must update light and dark semantic maps together. Do
not copy raw purple values into components; HeroUI tokens remain the single control
point.
