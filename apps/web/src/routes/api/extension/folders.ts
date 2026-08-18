import { createFileRoute } from "@tanstack/react-router"

import {
  createExtensionApiHeaders,
  requireExtensionRefreshToken,
} from "@/server/auth/extension-auth.server"
import { listExtensionFolderOptions } from "@/server/drive/extension-library.server"

export const Route = createFileRoute("/api/extension/folders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const headers = createExtensionApiHeaders(request)
        let refreshToken: string

        try {
          refreshToken = requireExtensionRefreshToken(request)
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Akasha authorization is required.",
            },
            { headers, status: 401 }
          )
        }

        try {
          return Response.json(
            { folders: await listExtensionFolderOptions(refreshToken) },
            { headers }
          )
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Akasha could not load your folders.",
            },
            { headers, status: 502 }
          )
        }
      },
      OPTIONS: ({ request }) =>
        new Response(null, {
          headers: createExtensionApiHeaders(request),
          status: 204,
        }),
    },
  },
})
