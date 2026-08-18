import { createFileRoute } from "@tanstack/react-router"

import { createGoogleAuthorizationUrl } from "@/server/auth/google-oauth.server"
import { useStillroomSession } from "@/server/auth/session.server"
import { createRedirectResponse } from "@/server/http/redirect.server"

export const Route = createFileRoute("/api/auth/google")({
  server: {
    handlers: {
      GET: async () => {
        const state = crypto.randomUUID()
        const session = await useStillroomSession()
        await session.update({
          ...session.data,
          extensionRedirectUri: undefined,
          oauthState: state,
        })

        return createRedirectResponse(createGoogleAuthorizationUrl(state))
      },
    },
  },
})
