# Web performance audit

Audited 2026-09-26 against `186e054` on `main`. Scope: `apps/web`, its shared folder utilities, and installed dependency behavior. Findings and line references below describe that baseline. Implementation results follow at the end.

## Findings

All findings concern performance. S means a focused change; M means several connected changes; L means a data-loading or rendering redesign. Impact describes expected benefit, not a measured production speedup. Confidence distinguishes confirmed code behavior from unmeasured user impact.

| # | Finding | Impact | Effort | Fix risk | Confidence | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Server imports the complete Google API SDK | Less cold-worker loading and memory overhead across auth, library, and media | S/M | Medium | High for unnecessary dependency load; production time saving unmeasured | `apps/web/src/server/auth/google-oauth.server.ts:1`, `apps/web/src/server/drive/drive.server.ts:14` |
| 2 | Gallery mounts the whole collection and revisits every card on parent updates | Less rendering work when opening previews, selecting items, or changing unrelated page state | M; bounded rendering is a separate larger step | Medium | High for rendering behavior; interaction latency unmeasured | `apps/web/src/features/library/media-gallery.tsx:41`, `:57`, `:95`; `apps/web/src/features/library/library-page.tsx:329` |
| 3 | Brief pointer hover immediately fetches full originals | Less speculative traffic while browsing; more bandwidth available for visible media | S | Low/medium | High for requests being scheduled; benefit depends on image sizes and browsing behavior | `apps/web/src/features/library/media-gallery.tsx:138`, `:156`, `:548` |
| 4 | Landing and library share eager feature imports | Less initial JavaScript, especially before sign-in; defer rarely used library controls | M | Medium | High for import graph and existing build; current deployed bytes unmeasured | `apps/web/src/routes/index.tsx:10`, `apps/web/src/features/library/library-page.tsx:15` |
| 5 | Every snapshot waits for every accessible Drive file page | Faster first content and refresh for large collections | L for progressive loading | High | High for sequential enumeration; production collection size unknown | `apps/web/src/server/drive/drive.server.ts:79`, `:183`; `apps/web/src/server/drive/library.server.ts:26`; `apps/web/src/features/library/library-upload.tsx:100` |

## Evidence and smallest useful changes

### 1. Narrow Google imports

Both OAuth and Drive import runtime `google` from the package root. The installed `googleapis@174.0.1` root requires API modules unrelated to Akasha. The existing September 22 server artifact contains a 26,631,891-byte `googleapis+[...].mjs` module. This is server code, not browser download size.

Use the installed package's narrow Drive entry point first. Its `build/src/apis/drive/index.js` exports both `drive` and `auth`, so a new dependency is not necessary to test this approach. Confirm the production bundler omits unrelated APIs. Preserve credential handling, OAuth scopes, refresh behavior, and streaming. Moving the same broad import to a lazy boundary merely postpones its cost.

Existing root-module mocks in `drive-actions.test.ts` and `drive-dedupe.test.ts` must follow changed imports. Relevant checks also include OAuth, extension-auth, Drive-stream, and media-proxy tests. Google's [client documentation](https://github.com/googleapis/google-api-nodejs-client#installation) explicitly discusses API-specific modules for startup cost; verify compatibility with the installed version before choosing an import.

### 2. Reduce gallery rendering work

`MediaGallery` owns lightbox `activeIndex` and maps every item on each render. `MediaCard` has no memo boundary. Each iteration creates new callbacks. Selection state and page dialogs also cause the parent to render the gallery. `useMemo` around filtering in `LibraryPage` saves filtering work but does not skip card renders.

A production-mode `renderToString` check against current source returned:

| Synthetic items | Image tags | Button tags | HTML bytes |
| --- | --- | --- | --- |
| 100 | 100 | 100 | 73,394 |
| 1,000 | 1,000 | 1,000 | 733,994 |

These are synthetic server-rendered markup sizes, not browser heap measurements or production timings. Native `loading="lazy"` defers image fetching; every React card and HTML element still exists.

Start with stable card props and a focused memo boundary, or separate lightbox updates from the list. Preserve item identity, selection, context menus, keyboard navigation, and modifier zoom. Do not wrap everything in memo: [React's reference](https://react.dev/reference/react/memo) explains why newly created function props defeat its default comparison.

Only pursue bounded rendering after profiling a representative large library. Appending slices to the current CSS columns can rebalance existing cards. Any such change needs a layout-aware design that preserves natural image sizes, focus, ordering, and access to all items. Existing tests: `media-gallery.test.tsx` and `library-page.test.tsx`.

### 3. Budget original-image prefetch

Both focus and pointer entry call `preloadOriginalImage`, which immediately assigns the full `/api/media/:id` URL to a new `Image`. There is no pointer dwell check, queued cancellation, or low fetch priority. Moving across distinct cards schedules their originals even without opening them. Browser cache can deduplicate repeats of the same URL; the issue is unnecessary requests for different originals.

Keep instant cached thumbnails and the high-priority active lightbox request. Add a short pointer dwell before speculative prefetch, cancel the pending start on pointer leave/unmount, and use low priority for speculation. Preserve keyboard focus behavior. Reuse browser caching instead of adding an application image cache. Measure rapid pointer traversal and sustained hover separately so the change does not make intentional opening slower.

Existing gallery tests cover preview priority, intrinsic geometry, and lightbox behavior. If implementation needs new tests, keep them to the successful prefetch path and cancellation path.

### 4. Split optional UI from initial load

The `/` route statically imports both `AuthLanding` and `LibraryPage`. The latter eagerly imports the command palette, folder dialogs, upload controls, and gallery. The existing September 22 client manifest preloads both these chunks for `/`:

| Existing artifact | Raw bytes | Locally calculated gzip bytes |
| --- | --- | --- |
| `index-CjjoaPbk.js` | 524,208 | 164,729 |
| `routes-PoH65Mmx.js` | 604,151 | 165,984 |
| Combined JavaScript | 1,128,359 | 330,713 |
| `styles-CNTM5pGv.css` | 815,514 | 86,885 |

Artifacts predate this audit. Their deployed equivalence and current transfer compression were not verified. The sizes identify investigation targets, not promised savings. Shared HeroUI and React code will remain.

Start by loading the authenticated library branch separately. Then split the command palette or other rarely used dialogs only if bundle analysis shows meaningful savings. Keep existing suspense behavior and avoid introducing another network waterfall for authenticated first paint. Do not replace HeroUI or apply component class overrides. Existing landing/library tests cover behavior; a fresh implementation build must demonstrate that deferred modules are absent from initial landing imports.

The landing illustration is also 785,830 bytes and has no `srcSet` in `auth-landing.tsx:69`. Responsive image variants are a small landing-only follow-up, ranked below authenticated app work.

### 5. Load large collections progressively

`listStillroomLibrary` calls `listDriveFiles` with `trashed = false`. The helper requests up to 1,000 files at a time and awaits each `nextPageToken` until exhausted. Only then does snapshot construction select items reachable from the Akasha root. This is limited by the intentional `drive.file` OAuth scope; it is not a scan of every file in the user's entire Google Drive.

Folder navigation already reuses a route snapshot for 30 seconds. The issue concerns initial loads, invalidations, and expired route loads. Upload completion invokes `onRefresh`, which invalidates and reloads the snapshot. Client-side folder selection does not make that initial server work smaller.

Preserve the existing single-list root discovery for small collections. Remove unused `webContentLink` from requested fields as a minor cleanup, but do not present that as the main fix. If measured collection size warrants it, design a first-page/cursor contract with explicit folder metadata and sorting rules. Server pagination and client bounded rendering should be planned together for that larger change.

Do not simply filter all reads by Akasha `appProperties`: existing mapping admits untagged media under the root, so such a filter could hide valid files. Keep legacy records, nested folder previews, sorting, moves, and upload refresh correct. Existing tests: `drive-library.test.ts`, `library.server.test.ts`, `library-thumbnail.server.test.ts`, and `library-page.test.tsx`.

## Checked and deferred

- Existing private image caching and direct streaming are present. Keep `private` cache headers and cookie/authorization variation. A public media cache is not an acceptable shortcut.
- Thumbnails already use signed URLs and direct preview fetches, with metadata refresh only after an upstream 401/403/404. Do not reimplement that optimization.
- Access tokens are reused until the expiry buffer. There is no refresh call on every normal image request. Concurrent requests near expiry can still refresh independently; investigate with a request trace before adding process-local single-flight coordination. Evidence: `google-oauth.server.ts:45` and `session.server.ts:27`.
- Filtering and folder previews already use `useMemo`. Blanket memoization and broad new state management are not justified.
- Keep Google Drive as the storage choice. No CDN/database migration is needed for the first three changes.
- Folder-preview recursion can repeat work for deeply nested empty folders, but no representative workload shows it outranks network and gallery costs. Deferred.
- Replacing CSS masonry, adding a virtualizer, persistent server caching, and broad dependency upgrades are not first-step recommendations.

## Verification and limits

- `bun run --cwd apps/web test`: 23 files, 87 tests passed.
- `bun run --cwd apps/web typecheck`: passed.
- Current gallery source was rendered with synthetic 100-item and 1,000-item collections in production mode. No network requests or source changes.
- Existing build artifacts were inspected, not rebuilt. No dev server started. Playwright was not run because its configuration can start a dev server.
- Brave computer use opened `https://akasha-olive.vercel.app`, discovered from repository homepage metadata. The landing page rendered. Browser session was signed out; authenticated media latency, scroll performance, LCP, and INP were not measured. DevTools timing capture could not be completed through the current computer-use session.
- No extension UI audit, general security audit, dependency upgrade audit, or authenticated mutation QA. Auth/privacy code was read only where it affects performance proposals.

After selected changes, use the existing web test, typecheck, lint, and production build commands. Run browser checks in open Brave against an already running app or a deployed preview. Do not start a dev server. Add at most one main-path and one critical-failure test where existing coverage does not prove the changed behavior.

## Implementation results

The user authorized implementation and focused commits after the audit. Concrete changes 1–4 are complete. Progressive loading remains conditional on representative collection measurements, as recommended above.

| Change | Commit | Result |
| --- | --- | --- |
| 1. Narrow Google SDK imports | `cfdc287` | Runtime imports use the installed Drive entry point; existing mocks updated |
| 2. Reduce gallery rerenders | `ca5f52f` | Memoized gallery/cards receive stable handlers; image geometry and all-item rendering preserved |
| 3. Budget original prefetch | `17dd5d4` | 150 ms hover delay, cancellation on leave/cancel/press/unmount, low request priority; keyboard focus remains immediate |
| 4. Split initial UI imports | `cabf37e` | TanStack lazy component loads the authenticated library separately, under existing suspense |
| 5. Progressive large-library loading | Deferred | No authenticated collection measurements available; pagination, ordering, and folder contracts unchanged |

Fresh production builds confirmed:

- Google SDK server module: 26,631,891 bytes before, 236,298 bytes after. The separate authentication library remains present.
- Initial landing JavaScript: about 330,713 gzip bytes before, 171,108 after, approximately 48% smaller. Gzip sizes were calculated locally; these are not observed deployed transfer sizes.
- Authenticated library is a separate 586,747-byte chunk, 160,682 bytes gzip. Total JavaScript is not reduced by splitting; signed-out visitors avoid loading this chunk. Authenticated hydration may need that additional chunk request; its timing has not been measured.
- Remaining large-chunk warnings concern the shared entry and deferred library chunk. No warning thresholds changed.

Final checks passed: 89 web tests in 23 files, web typecheck, ESLint on all changed source/test files, production build, and `git diff --check`. Two new tests cover successful hover/focus prefetch and cancellation. Existing tests cover selection, lightbox navigation, modifier zoom, folder actions, uploads, and server behavior.

Brave loaded the built app from a temporary production server at `127.0.0.1:4173`, with automatic environment-file loading disabled. Landing rendered, and the browser's resource entries showed only `index-B5wS9HdP.js` and `routes-CfU0bzDD.js`; no library chunk loaded. The temporary tab was closed and server stopped. No dev server started. Authenticated browser interactions and production latency remain unmeasured. Changes are local commits, not deployed or pushed.
