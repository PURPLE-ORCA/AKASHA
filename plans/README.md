# Stillroom performance and interface audit

Audit scope: `apps/web` at commit `452e482`.

The audit focused on the reported navigation latency, theme flash, missing loading
feedback, HeroUI theme regression, tab sizing, and removal of list mode. It also
traced the Google Drive snapshot and media-delivery paths because they dominate
the connected library's response time.

## Vetted findings

| # | Finding | Category | Impact | Effort | Fix risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Folder cards, breadcrumbs, and command-palette folder actions perform full-document navigation. Every click discards the current React tree, reruns SSR, and reloads the complete Drive snapshot. | Performance / correctness | High | S | Low | `apps/web/src/features/library/folder-tree.tsx:29-48`, `apps/web/src/features/library/library-toolbar.tsx:33-39`, `apps/web/src/features/library/library-command-palette.tsx:28-39` |
| 2 | Theme preference is read and applied only in client effects. The server document always starts with HeroUI's light default, so every document navigation visibly flashes light before the saved theme is restored. | Correctness / UX | High | S | Low | `apps/web/src/routes/__root.tsx:48-60`, `apps/web/src/features/library/library-page.tsx:43,89-106,287-292` |
| 3 | The route loader and preload cache are immediately stale, while the folder search parameter does not affect the snapshot. This defeats useful intent preloading and causes unnecessary revalidation. | Performance / architecture | High | S | Low | `apps/web/src/router.tsx:4-11`, `apps/web/src/routes/index.tsx:8-15` |
| 4 | A snapshot recursively lists every folder one at a time and ignores Drive pagination. Latency grows with folder count/depth, and libraries above 1,000 children can be incomplete. | Performance / correctness | High | M | Medium | `apps/web/src/server/drive/library.server.ts:21-80`, `apps/web/src/server/drive/drive.server.ts:46-59` |
| 5 | Every image proxy request creates a new OAuth client and asks for an access token before fetching the file. A masonry viewport therefore creates a burst of duplicated auth work before the images can paint. | Performance | High | M | Medium | `apps/web/src/routes/api/media/$fileId.ts:16-34`, `apps/web/src/server/auth/session.server.ts:5-8`, `apps/web/src/routes/api/auth/google.callback.ts:27-40` |
| 6 | The root route has no streamed or pending UI, and Boneyard is not installed. Users see the old page or a blank wait during genuine loader work. | UX / tooling | Medium | M | Medium | `apps/web/src/routes/index.tsx:8-33`, `apps/web/vite.config.ts:3-25`, `apps/web/package.json:16-58` |
| 7 | The HeroUI migration removed the established purple token map and imports the unmodified default theme. The prior purple values still exist in Git history and match the current design-system intent. | UI consistency | Medium | S | Low | `apps/web/src/styles.css:1-16`; prior tokens at `9658cb5:apps/web/src/styles.css:9-76`; `design-system/stillroom/MASTER.md:7-38` |
| 8 | List layout is retained across state, persistence, toolbar controls, media props, and CSS. Secondary Tabs stretch their list container by default, and there is no composition-level fit-content constraint. | UI correctness / tech debt | Medium | S | Low | `apps/web/src/features/library/library-page.tsx:40,89-110,162-217`, `apps/web/src/features/library/library-toolbar.tsx:1-71`, `apps/web/src/features/library/media-gallery.tsx:15-50`, `apps/web/src/styles.css:25,34-35` |
| 9 | Current tests cover authentication and two static library renders, but not client-side folder navigation, no-flash theme boot, pending skeletons, tabs sizing, or the Drive query count. | Test coverage | Medium | M | Low | `apps/web/e2e/library.e2e.ts:1-41`, `apps/web/src/features/library/library-page.test.tsx:1-58` |

## Plan index

| Plan | Priority | Depends on | Status |
| --- | --- | --- | --- |
| [001 — Make library navigation client-side and cache-aware](./001-client-navigation-and-router-cache.md) | P0 | — | Implemented in `9c24f75` |
| [002 — Restore the purple HeroUI theme and simplify the header](./002-theme-and-header-cleanup.md) | P0 | — | Implemented in `438d1b8` |
| [003 — Scale the Drive snapshot and media path](./003-drive-and-gallery-scaling.md) | P1 | 001 | Implemented in `c83a84c` |
| [004 — Add Boneyard streamed loading states](./004-boneyard-streaming-skeletons.md) | P1 | 001, 002 | Implemented in `e0c96f9` |

Recommended execution order: 001, 002, 003, 004. Plans 002 and 003 may run in
parallel after 001. Generate Boneyard bones last so they capture the final purple,
cards-only layout.

## Verification baseline

These commands pass at the audited commit:

```bash
bun run check
bun run typecheck
bun run lint
bun run test
```

Every executor must additionally run:

```bash
bun run build
bun run e2e
```

## Considered and rejected

- Adding TanStack Query is not justified yet. TanStack Router already owns this
  route's server data and provides the cache, stale-time, invalidation, preload,
  pending, and streamed-promise primitives required here.
- Removing private `no-store` response headers is not the fix. Sensitive Drive
  data should remain non-cacheable in shared HTTP caches; reuse should happen in
  the per-tab Router cache and through explicit browser-private media caching.
- Skeletoning every image with one fixed Boneyard shape is not appropriate for a
  variable-aspect-ratio masonry gallery. Capture the stable route/gallery shell,
  reserve each image's real aspect ratio, and progressively reveal media.
- No security, extension capture, deployment, accessibility-wide, or product
  roadmap audit was performed beyond code directly touched by these plans.
