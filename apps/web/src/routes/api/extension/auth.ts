import { createFileRoute } from "@tanstack/react-router"

import {
  createExtensionCredentialCallback,
  requireExtensionRedirectUri,
} from "@/server/auth/extension-auth.server"
import { createGoogleAuthorizationUrl } from "@/server/auth/google-oauth.server"
import { useStillroomSession } from "@/server/auth/session.server"
import { createRedirectResponse } from "@/server/http/redirect.server"

export const Route = createFileRoute("/api/extension/auth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let redirectUri: string

        try {
          const requestUrl = new URL(request.url)
          redirectUri = requireExtensionRedirectUri(
            requestUrl.searchParams.get("redirect_uri")
          )
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Akasha Capture could not start authorization.",
            },
            { status: 400 }
          )
        }

        const session = await useStillroomSession()

        if (session.data.googleRefreshToken) {
          await session.update(session.data)
          return createRedirectResponse(
            createExtensionCredentialCallback(redirectUri, {
              accessToken: session.data.googleAccessToken,
              accessTokenExpiresAt: session.data.googleAccessTokenExpiresAt,
              refreshToken: session.data.googleRefreshToken,
            })
          )
        }

        const state = crypto.randomUUID()
        await session.update({
          ...session.data,
          extensionRedirectUri: redirectUri,
          oauthState: state,
        })

        return createRedirectResponse(createGoogleAuthorizationUrl(state))
      },
    },
  },
})
