# Akasha

Akasha is a private visual-reference library. Capture images and showcase videos from the browser extension, organize them into nested folders, and browse the same Google Drive-backed collection on the web.

## Workspace

- `apps/web` — TanStack Start web application and server routes
- `extension` — WXT Manifest V3 browser extension
- `packages/contracts` — shared Zod schemas and folder utilities
- `design-system/stillroom` — product design-system guidance
- `design/mockups` — visual direction artifacts

The web app's server functions and API routes are the backend for v1, so a separate backend workspace is not needed.

## Setup

Install dependencies:

```bash
bun install
```

Create the web environment:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Enable the Google Drive API in a Google Cloud project, create a web OAuth client, and register `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI. Add that client ID and secret to `apps/web/.env.local`, then generate a session secret of at least 32 characters.

Create a Chrome Extension OAuth client for the capture extension and add its client ID to `extension/.env.local`:

```bash
cp extension/.env.example extension/.env.local
```

For Chromium browsers that do not expose Chrome profile authentication, also add the web OAuth client ID as `WXT_GOOGLE_WEB_CLIENT_ID` and register `https://cooplhaddmnookoploidbemfjdacgnoh.chromiumapp.org/oauth2` as an authorized redirect URI on that web client.

Both clients must request the `drive.file` scope. This limits Akasha to files and folders it creates or opens through the app.

## Development

Run the web app:

```bash
bun run dev:web
```

Run the extension development build:

```bash
bun run dev:extension
```

The web preview is available at [http://localhost:3000](http://localhost:3000). WXT writes the unpacked Chrome build to `extension/.output/chrome-mv3`.

## Quality gates

```bash
bun run typecheck
bun run test
bun run lint
bun run e2e
bun run build
```

Playwright covers the responsive library, search, folder navigation, and selection states in desktop and mobile Chromium.
