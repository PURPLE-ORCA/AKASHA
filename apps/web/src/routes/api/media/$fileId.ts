import { createFileRoute } from "@tanstack/react-router"

import { getGoogleAccessToken } from "@/server/auth/google-oauth.server"
import { useStillroomSession } from "@/server/auth/session.server"
import {
  createDriveMediaRequestHeaders,
  createMediaProxyResponse,
} from "@/server/drive/media-proxy.server"

export const Route = createFileRoute("/api/media/$fileId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (!process.env.SESSION_SECRET) {
          return new Response("Library access is not available.", {
            status: 401,
          })
        }

        const session = await useStillroomSession()
        const refreshToken = session.data.googleRefreshToken

        if (!refreshToken) {
          return new Response("Library access is required.", { status: 401 })
        }

        const credentials = await getGoogleAccessToken({
          accessToken: session.data.googleAccessToken,
          accessTokenExpiresAt: session.data.googleAccessTokenExpiresAt,
          refreshToken,
        })

        if (!credentials) {
          return new Response("Library access expired.", { status: 401 })
        }

        if (
          credentials.accessToken !== session.data.googleAccessToken ||
          credentials.accessTokenExpiresAt !==
            session.data.googleAccessTokenExpiresAt
        ) {
          await session.update({
            ...session.data,
            googleAccessToken: credentials.accessToken,
            googleAccessTokenExpiresAt: credentials.accessTokenExpiresAt,
          })
        }

        const driveResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(params.fileId)}?alt=media`,
          {
            headers: createDriveMediaRequestHeaders(
              request.headers,
              credentials.accessToken
            ),
          }
        )

        if (!driveResponse.ok && ![304, 416].includes(driveResponse.status)) {
          return new Response("Media could not be loaded.", {
            status: driveResponse.status,
          })
        }

        return createMediaProxyResponse(driveResponse)
      },
    },
  },
})
