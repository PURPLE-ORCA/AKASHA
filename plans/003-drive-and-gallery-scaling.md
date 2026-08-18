# 003 — Scale the Drive snapshot and media path

Written against commit `452e482`.

Implemented in `c83a84c`.

Depends on plan 001 so folder navigation no longer creates avoidable snapshot
requests before this work optimizes the requests that remain.

## Why this matters

`loadDriveLibrary` currently performs one Drive list call for the root and then one
additional call for every folder, sequentially by subtree. It also reads only the
first 1,000 children. Every gallery image then creates a fresh OAuth client and
requests an access token before it can fetch bytes. These costs compound visibly
in a Pinterest-style gallery.

The extension already demonstrates the intended bulk pattern in
`extension/utils/google-drive.ts:71-111`: list folders, build a parent map, and
flatten locally.

## Files in scope

- `apps/web/src/server/drive/drive.server.ts`
- `apps/web/src/server/drive/library.server.ts`
- `apps/web/src/server/drive/drive-query.ts`
- `apps/web/src/routes/api/media/$fileId.ts`
- `apps/web/src/routes/api/auth/google.callback.ts`
- `apps/web/src/server/auth/session.server.ts`
- `apps/web/src/features/library/media-gallery.tsx`
- Drive, media, and gallery tests

## Files explicitly out of scope

- OAuth scopes or Google Cloud configuration
- Moving away from Google Drive as source of truth
- Public media URLs
- Upload/extension behavior
- Boneyard skeleton generation

## Implementation steps

1. Add a reusable paginated Drive list helper that follows `nextPageToken` until
   exhausted and requests only the fields required by the caller. Unit-test one,
   two, and empty pages. Preserve query escaping.

2. Replace recursive `collectFolderContents` with bulk discovery:
   - Ensure and retain the Stillroom root.
   - List accessible non-trashed folders and Stillroom items, following pagination.
   - Run independent folder/item list calls concurrently.
   - Build `childrenByParent` and a reachable-folder set starting at the Stillroom
     root; exclude unrelated Drive entries even if the OAuth client can see them.
   - Map reachable folders and items locally while preserving the existing
     `LibraryFolder` and `LibraryItem` schemas and stable ordering.

3. Add characterization tests before replacing traversal: nested folders, sibling
   folders, root items, nested items, unrelated folders, missing metadata, and more
   than one Drive page must produce the expected snapshot. Add a request-count
   assertion proving the number of list calls does not grow with folder depth.

4. Preserve the access token returned by the OAuth callback along with its expiry
   in the encrypted HTTP-only session. Add a server helper that returns a token
   when it remains valid with a safety margin and refreshes/updates the session
   otherwise. Never send the refresh or access token to client JavaScript.

5. Make the media route use that helper instead of constructing an OAuth client
   and calling `getAccessToken()` for every image. Forward Drive's `ETag` and useful
   content headers. Use browser-private caching appropriate for immutable file IDs
   (recommended starting point: one hour plus conditional revalidation). Retain
   `Vary: Cookie, Authorization` and authorization checks.

6. Improve first-viewport image scheduling. Keep width/height attributes, eagerly
   load only the first small viewport batch (recommended 4–6 images), give those
   images high fetch priority, and leave the rest lazy. Track loaded/error state
   without adding titles, hover chrome, or card actions.

7. Add incremental client rendering for large All views. Render an initial batch
   (recommended 60), append bounded batches through an `IntersectionObserver`
   sentinel, and keep the lightbox's item array complete so arrow navigation is
   not truncated. Disconnect the observer on unmount and reset the window when
   the folder/item set changes.

## Per-step verification

After Drive refactor:

```bash
bun run --cwd apps/web test -- src/server/drive
bun run --cwd apps/web typecheck
```

Expected: pagination/nesting tests pass and request count is constant relative to
folder depth.

After media/gallery changes:

```bash
bun run --cwd apps/web test
bun run --cwd apps/web lint
bun run --cwd apps/web build
```

Use a local connected library and browser network inspection to verify:

- folder navigation inside the freshness window makes zero Drive snapshot calls;
- a cold snapshot uses a bounded number of paginated list calls;
- visible image requests do not each trigger an OAuth token refresh;
- only the first media batch exists in the DOM before scrolling.

## Done criteria

- Snapshot list-call count does not scale with folder depth.
- Every Drive page is consumed; no 1,000-item truncation remains.
- Only descendants of the Stillroom root appear.
- Access/refresh tokens remain server-only and session-protected.
- One gallery viewport does not cause one OAuth refresh per image.
- Large All views grow in bounded batches while lightbox arrows still traverse the
  complete result set.

## Escape hatches

- If `drive.file` does not return all descendant folders in a bulk folder query for
  an existing real library, stop and keep paginated recursive traversal, but fetch
  sibling subtrees with bounded concurrency (maximum 4). Do not use unbounded
  `Promise.all` against Drive.
- If session-cookie size approaches browser limits after storing access-token
  metadata, stop and use a server-side single-flight token cache keyed by a
  one-way hash of the refresh token. Never key logs or caches with the raw token.
- If incremental masonry append visibly reorders existing columns, stop and keep
  the bounded DOM work as a separate page/window rather than accepting layout
  jumps.

## Maintenance note

The Drive schemas are the compatibility boundary shared with the extension. New
file types or app properties require matching web snapshot and extension tests.
