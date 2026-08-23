import {
  libraryUploadMimeTypeSchema,
  maximumLibraryUploadBytes,
} from "@akasha/contracts"
import { createFileRoute } from "@tanstack/react-router"

import { getGoogleAccessToken } from "@/server/auth/google-oauth.server"
import type { GoogleTokenCredentials } from "@/server/auth/google-oauth.server"
import { useStillroomSession } from "@/server/auth/session.server"
import {
  CaptureSourceError,
  saveUploadedImage,
} from "@/server/drive/drive.server"
import {
  assertLibraryUploadDestination,
  LibraryUploadDestinationError,
} from "@/server/drive/library-upload.server"

const maximumMultipartOverheadBytes = 1024 * 1024

export const Route = createFileRoute("/api/uploads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headers = createUploadHeaders()

        if (!isSameOriginUploadRequest(request)) {
          return Response.json(
            { error: "Akasha could not verify this upload request." },
            { headers, status: 403 }
          )
        }
        if (!process.env.SESSION_SECRET) {
          return Response.json(
            { error: "Connect your library before uploading." },
            { headers, status: 401 }
          )
        }

        const contentLength = Number(request.headers.get("Content-Length"))
        if (
          Number.isFinite(contentLength) &&
          contentLength >
            maximumLibraryUploadBytes + maximumMultipartOverheadBytes
        ) {
          return Response.json(
            { error: "This image is too large to save." },
            { headers, status: 413 }
          )
        }
        if (
          !request.headers
            .get("Content-Type")
            ?.startsWith("multipart/form-data")
        ) {
          return Response.json(
            { error: "Choose an image to upload." },
            { headers, status: 400 }
          )
        }

        const session = await useStillroomSession()
        const refreshToken = session.data.googleRefreshToken
        if (!refreshToken) {
          return Response.json(
            { error: "Connect your library before uploading." },
            { headers, status: 401 }
          )
        }

        const accessToken = await getGoogleAccessToken({
          accessToken: session.data.googleAccessToken,
          accessTokenExpiresAt: session.data.googleAccessTokenExpiresAt,
          refreshToken,
        })
        if (!accessToken) {
          return Response.json(
            { error: "Your library connection expired." },
            { headers, status: 401 }
          )
        }

        if (
          accessToken.accessToken !== session.data.googleAccessToken ||
          accessToken.accessTokenExpiresAt !==
            session.data.googleAccessTokenExpiresAt
        ) {
          await session.update({
            ...session.data,
            googleAccessToken: accessToken.accessToken,
            googleAccessTokenExpiresAt: accessToken.accessTokenExpiresAt,
          })
        }

        const credentials: GoogleTokenCredentials = {
          ...accessToken,
          refreshToken,
        }
        const form = await request.formData().catch(() => null)
        const file = form?.get("file")
        const folderId = form?.get("folderId")

        if (
          !(file instanceof File) ||
          typeof folderId !== "string" ||
          folderId.length === 0
        ) {
          return Response.json(
            { error: "Choose an image and destination folder." },
            { headers, status: 400 }
          )
        }
        if (file.size > maximumLibraryUploadBytes) {
          return Response.json(
            { error: "This image is too large to save." },
            { headers, status: 413 }
          )
        }
        if (!libraryUploadMimeTypeSchema.safeParse(file.type).success) {
          return Response.json(
            { error: "This image format is not supported." },
            { headers, status: 415 }
          )
        }

        try {
          await assertLibraryUploadDestination(credentials, folderId)
          const result = await saveUploadedImage(credentials, folderId, {
            byteSize: file.size,
            fileName: file.name,
            mimeType: file.type,
            stream: file.stream(),
          })

          return Response.json(
            { fileId: result.file.id, outcome: result.outcome },
            {
              headers,
              status: result.outcome === "saved" ? 201 : 200,
            }
          )
        } catch (error) {
          return createUploadErrorResponse(error, headers)
        }
      },
    },
  },
})

export function isSameOriginUploadRequest(request: Request) {
  const origin = request.headers.get("Origin")
  if (!origin) return false

  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

function createUploadHeaders() {
  return new Headers({
    "Cache-Control": "private, no-store",
    Vary: "Cookie, Authorization",
    "X-Content-Type-Options": "nosniff",
  })
}

function createUploadErrorResponse(error: unknown, headers: Headers) {
  if (error instanceof LibraryUploadDestinationError) {
    return Response.json({ error: error.message }, { headers, status: 422 })
  }
  if (error instanceof CaptureSourceError) {
    const status = error.message.includes("too large")
      ? 413
      : error.message.includes("format")
        ? 415
        : 422
    return Response.json({ error: error.message }, { headers, status })
  }
  if (typeof error === "object" && error && "code" in error) {
    const code = Number(error.code)
    if (code === 401) {
      return Response.json(
        { error: "Your library connection expired." },
        { headers, status: 401 }
      )
    }
  }

  return Response.json(
    { error: "Akasha could not upload this image." },
    { headers, status: 502 }
  )
}
