import { createFileRoute } from "@tanstack/react-router"

import { createGoogleOAuthClient } from "@/server/auth/google-oauth.server"
import { useStillroomSession } from "@/server/auth/session.server"

export const Route = createFileRoute("/api/media/$fileId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
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

        const oauthClient = createGoogleOAuthClient()
        oauthClient.setCredentials({ refresh_token: refreshToken })
        const accessToken = await oauthClient.getAccessToken()

        if (!accessToken.token) {
          return new Response("Library access expired.", { status: 401 })
        }

        const driveResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(params.fileId)}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken.token}` } }
        )

        if (!driveResponse.ok || !driveResponse.body) {
          return new Response("Media could not be loaded.", {
            status: driveResponse.status,
          })
        }

        return new Response(driveResponse.body, {
          headers: {
            "Cache-Control": "private, max-age=300",
            "Content-Type":
              driveResponse.headers.get("Content-Type") ??
              "application/octet-stream",
            Vary: "Cookie, Authorization",
          },
        })
      },
    },
  },
})
