import { captureRequestSchema } from "@akasha/contracts"
import { createFileRoute } from "@tanstack/react-router"

import {
  createExtensionApiHeaders,
  requireExtensionRefreshToken,
} from "@/server/auth/extension-auth.server"
import { saveCapture } from "@/server/drive/drive.server"

export const Route = createFileRoute("/api/extension/captures")({
  server: {
    handlers: {
      OPTIONS: ({ request }) =>
        new Response(null, {
          headers: createExtensionApiHeaders(request),
          status: 204,
        }),
      POST: async ({ request }) => {
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

        const captureResult = captureRequestSchema.safeParse(
          await request.json().catch(() => null)
        )

        if (!captureResult.success) {
          return Response.json(
            { error: "Akasha received an invalid capture." },
            { headers, status: 400 }
          )
        }

        try {
          const capture = captureResult.data
          const file = await saveCapture(
            refreshToken,
            capture,
            capture.folderId
          )
          return Response.json({ file }, { headers, status: 201 })
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Akasha could not save this item.",
            },
            { headers, status: 502 }
          )
        }
      },
    },
  },
})
