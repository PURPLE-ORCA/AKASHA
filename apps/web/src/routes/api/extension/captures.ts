import { captureRequestSchema } from "@akasha/contracts"
import { createFileRoute } from "@tanstack/react-router"

import {
  createExtensionApiHeaders,
  resolveExtensionGoogleCredentials,
  setExtensionCredentialHeader,
} from "@/server/auth/extension-auth.server"
import type { GoogleTokenCredentials } from "@/server/auth/google-oauth.server"
import { CaptureSourceError, saveCapture } from "@/server/drive/drive.server"

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
        const authenticationStartedAt = performance.now()
        let credentials: GoogleTokenCredentials

        try {
          credentials = await resolveExtensionGoogleCredentials(request)
          setExtensionCredentialHeader(headers, credentials)
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
        const authenticationMs = performance.now() - authenticationStartedAt

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
          const result = await saveCapture(
            credentials,
            capture,
            capture.folderId,
            {
              attempt: capture.attempt,
              captureId: capture.captureId,
            }
          )
          headers.set(
            "Server-Timing",
            createCaptureServerTiming(authenticationMs, result.timings)
          )
          return Response.json({ file: result.file }, { headers, status: 201 })
        } catch (error) {
          const status = getCaptureErrorStatus(error)
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Akasha could not save this item.",
            },
            { headers, status }
          )
        }
      },
    },
  },
})

function createCaptureServerTiming(
  authenticationMs: number,
  timings: {
    driveUploadMs: number
    idempotencyMs: number
    sourceResponseMs: number
  }
) {
  return [
    `auth;dur=${authenticationMs.toFixed(1)}`,
    `source;dur=${timings.sourceResponseMs.toFixed(1)}`,
    `idempotency;dur=${timings.idempotencyMs.toFixed(1)}`,
    `drive;dur=${timings.driveUploadMs.toFixed(1)}`,
  ].join(", ")
}

function getCaptureErrorStatus(error: unknown) {
  if (error instanceof CaptureSourceError) return 422

  if (typeof error === "object" && error && "code" in error) {
    const code = Number(error.code)
    if (code === 401) return 401
    if ([400, 403, 404].includes(code)) return 422
  }

  return 502
}
