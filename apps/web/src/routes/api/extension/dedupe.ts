import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import {
  createExtensionApiHeaders,
  resolveExtensionGoogleCredentials,
  setExtensionCredentialHeader,
} from "@/server/auth/extension-auth.server"
import type { GoogleTokenCredentials } from "@/server/auth/google-oauth.server"
import { backfillCaptureDedupeMetadata } from "@/server/drive/drive.server"

const backfillRequestSchema = z.object({
  pageToken: z.string().min(1).max(2048).optional(),
})

export const Route = createFileRoute("/api/extension/dedupe")({
  server: {
    handlers: {
      OPTIONS: ({ request }) =>
        new Response(null, {
          headers: createExtensionApiHeaders(request),
          status: 204,
        }),
      POST: async ({ request }) => {
        const headers = createExtensionApiHeaders(request)
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

        const input = backfillRequestSchema.safeParse(
          await request.json().catch(() => ({}))
        )

        if (!input.success) {
          return Response.json(
            { error: "Akasha received an invalid library scan request." },
            { headers, status: 400 }
          )
        }

        try {
          return Response.json(
            await backfillCaptureDedupeMetadata(
              credentials,
              input.data.pageToken
            ),
            { headers }
          )
        } catch (error) {
          if (
            input.data.pageToken &&
            typeof error === "object" &&
            error &&
            "code" in error &&
            Number(error.code) === 400
          ) {
            return Response.json(
              {
                restart: true,
                scannedCount: 0,
                updatedCount: 0,
              },
              { headers }
            )
          }

          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Akasha could not scan the library.",
            },
            { headers, status: 502 }
          )
        }
      },
    },
  },
})
