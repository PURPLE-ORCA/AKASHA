import { createFileRoute } from "@tanstack/react-router"

import { createGoogleOAuthClient } from "@/server/auth/google-oauth.server"
import {
  createExtensionCallbackUrl,
  createExtensionCredentialCallback,
} from "@/server/auth/extension-auth.server"
import { useStillroomSession } from "@/server/auth/session.server"
import { createRedirectResponse } from "@/server/http/redirect.server"

export const Route = createFileRoute("/api/auth/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const callbackUrl = new URL(request.url)
        const code = callbackUrl.searchParams.get("code")
        const returnedState = callbackUrl.searchParams.get("state")
        const authorizationError = callbackUrl.searchParams.get("error")
        const session = await useStillroomSession()
        const extensionRedirectUri = session.data.extensionRedirectUri

        if (
          authorizationError ||
          !code ||
          !returnedState ||
          returnedState !== session.data.oauthState
        ) {
          await session.update({
            ...session.data,
            extensionRedirectUri: undefined,
            oauthState: undefined,
          })

          if (extensionRedirectUri) {
            return createRedirectResponse(
              createExtensionCallbackUrl(extensionRedirectUri, {
                error: "authorization_failed",
              })
            )
          }

          return redirectToLibrary(request, "failed")
        }

        const oauthClient = createGoogleOAuthClient()
        const { tokens } = await oauthClient.getToken(code)
        const refreshToken =
          tokens.refresh_token ?? session.data.googleRefreshToken

        if (!refreshToken) {
          await session.update({
            ...session.data,
            extensionRedirectUri: undefined,
            oauthState: undefined,
          })

          if (extensionRedirectUri) {
            return createRedirectResponse(
              createExtensionCallbackUrl(extensionRedirectUri, {
                error: "authorization_failed",
              })
            )
          }

          return redirectToLibrary(request, "failed")
        }

        await session.update({
          googleAccessToken: tokens.access_token ?? undefined,
          googleAccessTokenExpiresAt: tokens.expiry_date ?? undefined,
          googleRefreshToken: refreshToken,
          extensionRedirectUri: undefined,
          oauthState: undefined,
        })

        if (extensionRedirectUri) {
          return createRedirectResponse(
            createExtensionCredentialCallback(extensionRedirectUri, {
              accessToken: tokens.access_token ?? undefined,
              accessTokenExpiresAt: tokens.expiry_date ?? undefined,
              refreshToken,
            }),
            303
          )
        }

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

  return createRedirectResponse(libraryUrl, 303)
}
