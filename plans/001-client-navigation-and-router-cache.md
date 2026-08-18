# 001 — Make library navigation client-side and cache-aware

Written against commit `452e482`.

Implemented in `9c24f75`.

## Why this matters

The current folder surfaces bypass TanStack Router. A folder click creates a new
document, reruns the root server loader, repeats the Drive crawl, resets all local
UI state, and triggers the theme flash. Folder selection is only a search-param
change; it must reuse the already-loaded snapshot in memory.

TanStack Router's data cache keys a loader by route and `loaderDeps`. The folder
search parameter is presentation state and must not become a loader dependency.
Successful route data is stale by default, so this route also needs an explicit,
short freshness window and mutation-driven invalidation.

## Current state excerpts

`apps/web/src/features/library/folder-tree.tsx`:

```tsx
const href = `/?folder=${folder.id}`
<a href={href}>...</a>
```

`apps/web/src/features/library/library-command-palette.tsx`:

```tsx
window.location.assign(`/?folder=${command.slice("folder:".length)}`)
```

`apps/web/src/router.tsx`:

```tsx
defaultPreload: "intent",
defaultPreloadStaleTime: 0,
```

## Files in scope

- `apps/web/src/router.tsx`
- `apps/web/src/routes/__root.tsx`
- `apps/web/src/routes/index.tsx`
- `apps/web/src/features/library/folder-tree.tsx`
- `apps/web/src/features/library/library-toolbar.tsx`
- `apps/web/src/features/library/library-command-palette.tsx`
- `apps/web/src/features/library/library-page.tsx`
- New focused tests under `apps/web/src/features/library/` and `apps/web/e2e/`

## Files explicitly out of scope

- Drive query implementation
- Theme token values
- Boneyard installation
- Extension navigation

## Implementation steps

1. Add React Aria routing integration at the root so HeroUI links and breadcrumb
   items delegate same-origin navigation to TanStack Router. Use the documented
   `RouterProvider` from `react-aria-components` and a `useNavigate` adapter.
   Preserve normal modified-click behavior and external links. Do not pass a
   custom `className` to HeroUI components.

2. Replace folder-card `<a>` elements with TanStack Router `Link` instances using
   `to="/"` and typed `search` updates. Preserve the existing `folder-link` class
   on the TanStack link, arrow-key focus behavior, and native Enter activation.
   Replace the Space handler's `window.location.assign` with the router's
   navigation API.

3. Replace both command-palette `window.location.assign` branches with one typed
   `useNavigate` call. Root navigation must remove `folder` while preserving only
   valid unrelated search state. Folder navigation must set `folder` without a
   document reload.

4. Keep `defaultPreload: "intent"`. Set a non-zero preload freshness window and
   an explicit route `staleTime` (recommended starting point: 30 seconds). Add
   `loaderDeps: () => ({})` to document that `folder` and `connection` do not
   change the Drive snapshot. Do not use `Infinity`: captures can arrive through
   the browser extension outside the current tab.

5. Keep explicit invalidation after create, move, and delete. Limit invalidation
   to the library route if the installed Router version exposes a stable typed
   filter API; otherwise keep `router.invalidate()` and document why it is safe
   while the app has a single data route. Do not invalidate on folder navigation.

6. Add a navigation regression test. Mount the real route with an in-memory
   TanStack history and a fixed loader result, navigate between two folder search
   states, and assert the loader executes once inside the freshness window. Also
   assert the selected folder content changes.

7. Add a browser regression test using a connected-library fixture or mocked
   server function. Store a sentinel on `window`, activate a folder card and a
   command-palette folder command, and assert the sentinel remains. This proves
   the document was not replaced. Assert browser Back restores the prior folder.

## Per-step verification

After steps 1–5:

```bash
bun run --cwd apps/web typecheck
bun run --cwd apps/web lint
rg -n "window\.location\.assign|href=\{`/\?folder" apps/web/src/features/library
```

Expected: typecheck and lint pass; the search command returns no folder-navigation
matches.

After tests:

```bash
bun run --cwd apps/web test
bun run --cwd apps/web e2e
```

Expected: all tests pass, with new assertions proving loader reuse, client-side
navigation, and Back behavior.

## Done criteria

- Folder cards, breadcrumbs, and command-palette folder commands do not replace
  the document.
- Folder navigation changes visible content without calling the snapshot loader
  again while the route data is fresh.
- Create, move, and delete still refresh Drive-backed data.
- Back and Forward restore the correct folder.
- No HeroUI component receives a custom `className`.

## Escape hatches

- If `RouterProvider` cannot adapt TanStack navigation without breaking modified
  clicks, stop and use TanStack's `createLink` to create typed adapters for HeroUI
  `Link` and `Breadcrumbs.Item`. Do not fall back to click handlers that always
  call `preventDefault`.
- If changing a search parameter still reloads the route despite empty
  `loaderDeps` and fresh data, stop and capture the Router devtools transition
  trace before changing cache durations.

## Maintenance note

Any future search parameter that changes server data must be added deliberately to
`loaderDeps`. Pure display state such as active folder, active tab, or overlay must
remain outside the loader key.
