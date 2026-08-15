import { createFileRoute } from "@tanstack/react-router"

import { createGoogleOAuthClient } from "@/server/auth/google-oauth.server"
import { useStillroomSession } from "@/server/auth/session.server"

export const Route = createFileRoute("/api/auth/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const callbackUrl = new URL(request.url)
        const code = callbackUrl.searchParams.get("code")
        const returnedState = callbackUrl.searchParams.get("state")
        const authorizationError = callbackUrl.searchParams.get("error")
        const session = await useStillroomSession()

        if (
          authorizationError ||
          !code ||
          !returnedState ||
          returnedState !== session.data.oauthState
        ) {
          await session.update({ oauthState: undefined })
          return redirectToLibrary(request, "failed")
        }

        const oauthClient = createGoogleOAuthClient()
        const { tokens } = await oauthClient.getToken(code)
        const refreshToken =
          tokens.refresh_token ?? session.data.googleRefreshToken

        if (!refreshToken) {
          await session.update({ oauthState: undefined })
          return redirectToLibrary(request, "failed")
        }

        await session.update({
          googleRefreshToken: refreshToken,
          oauthState: undefined,
        })

        return redirectToLibrary(request, "connected")
      },
    },
  },
})

function redirectToLibrary(
  request: Request,
  connection: "connected" | "failed"
) {
  const libraryUrl = new URL("/", request.url)
  libraryUrl.searchParams.set("connection", connection)

  return Response.redirect(libraryUrl, 303)
}
