# 004 — Add Boneyard streamed loading states

Written against commit `452e482`.

Implemented in `e0c96f9`.

Depends on plans 001 and 002. Client navigation and the final cards-only purple
layout must exist before capturing bones, otherwise the generated skeleton registry
will encode obsolete geometry and colors.

## Why this matters

The root loader blocks on session and Drive work before rendering the connected
library, and no pending component or Suspense fallback exists. Boneyard 1.9.0 is
compatible with React 19 and Vite 8, provides `Skeleton`/`BoneSuspense`, supports
authenticated fixtures during build capture, and generates responsive bones via a
Vite plugin.

Upstream references:

- `https://github.com/0xGF/boneyard`
- `https://boneyard.vercel.app/overview`

## Files in scope

- `apps/web/package.json` and `bun.lock`
- `apps/web/vite.config.ts`
- New `apps/web/boneyard.config.json`
- New `apps/web/src/bones/` generated registry and JSON files
- New focused loading fixture/component under `apps/web/src/features/library/`
- `apps/web/src/routes/index.tsx`
- `apps/web/src/routes/__root.tsx` or the single client entry that imports the
  generated registry
- Loading tests and scripts

## Files explicitly out of scope

- Hand-authored rectangle skeletons
- A new UI component library
- Replacing TanStack Router with TanStack Query
- Product-visible fixture or development copy
- Skeleton overlays for every variable-ratio image card

## Implementation steps

1. Add `boneyard-js` at the audited compatible range (`^1.9.0`). Add the documented
   `boneyardPlugin()` to Vite. Keep TanStack Start and React plugins in their
   required order; confirm the Boneyard plugin does not run capture work during a
   production build unless explicitly requested.

2. Add `apps/web/boneyard.config.json` with output `./src/bones`, wait 800ms, and
   breakpoints 375, 768, 1024, and 1440 to match Stillroom's design-system gates.
   Use pulse animation without stagger. Configure runtime colors from HeroUI
   semantic variables (`var(--default)` for both theme branches) so bones follow
   the restored theme without raw component colors.

3. Change the route loader to return the library-state promise rather than await
   it before the route component can render. Consume it under TanStack Router's
   supported `Await`/Suspense primitive. Do not expose refresh tokens or other
   server-only values in the promise payload.

4. Wrap the suspended library branch in `BoneSuspense name="library-shell"`.
   Provide a build-only `fixture` that renders the real cards-only shell with
   representative local `LibraryFolder`/`LibraryItem` objects and varied image
   dimensions. The fixture must contain no network calls, provider names, TODOs,
   demo labels, or product-visible development text. Boneyard renders it only when
   `__BONEYARD_BUILD` is active.

5. Import the generated `src/bones/registry` once before any skeleton renders.
   Do not import individual JSON files throughout feature components. Ensure the
   pre-paint theme bootstrap from plan 002 runs before Boneyard detects `.dark`.

6. Add scripts:
   - `bones:build` — deterministic capture at the configured breakpoints.
   - `bones:watch` — optional local recapture during deliberate skeleton work.
   Do not make every ordinary formatter/test command rewrite bones.

7. Run the capture and commit the generated registry plus responsive JSON. Inspect
   each breakpoint visually. The skeleton must reserve the sticky header, compact
   tabs, and masonry media region without rendering titles or card chrome.

8. Add a component test with a controlled unresolved promise and known initial
   bones. Assert the loading region is present and the resolved library replaces
   it. Add a reduced-motion assertion that animation is effectively disabled by
   existing global CSS. Add an E2E delay around the library server request and
   verify the skeleton appears before content without a blank frame.

## Per-step verification

```bash
bun install
bun run --cwd apps/web bones:build
find apps/web/src/bones -maxdepth 1 -type f -print | sort
```

Expected: one registry and responsive `library-shell` bones are generated with all
four breakpoints.

Then run:

```bash
bun run check
bun run typecheck
bun run lint
bun run test
bun run build
bun run e2e
```

Expected: all repository gates pass. The production build must not launch a
capture browser or rewrite generated bones.

## Done criteria

- A cold or deliberately delayed library request immediately renders a
  layout-stable Boneyard skeleton.
- Fast, cache-hit folder navigation does not flash a skeleton.
- Skeleton colors match light/dark HeroUI tokens and never flash light in dark mode.
- Generated bones cover 375, 768, 1024, and 1440 widths.
- No fixture content is visible in normal development or production runtime.
- Production build, unit tests, and Playwright pass.

## Escape hatches

- If `BoneSuspense` cannot consume the installed TanStack Router promise boundary,
  use Boneyard `Skeleton` as the route's pending component with pre-generated
  bones. Do not revert to manually measured placeholder rectangles.
- If the Vite plugin cannot capture the authenticated route, keep the build-only
  fixture mounted inside the Suspense boundary and capture that route. Do not add
  a public fixture route or weaken authentication.
- If Boneyard and the root Playwright package resolve incompatible browser
  revisions, stop and align the versions through Bun's lockfile. Do not download
  multiple browser binaries silently in CI.

## Maintenance note

Regenerate bones whenever header geometry, tabs, gallery column breakpoints, or
major type metrics change. Ordinary data/backend changes should not rewrite them.
