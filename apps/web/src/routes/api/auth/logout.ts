import { createFileRoute } from "@tanstack/react-router"

import { useStillroomSession } from "@/server/auth/session.server"
import { createRedirectResponse } from "@/server/http/redirect.server"

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await useStillroomSession()
        await session.clear()

        return createRedirectResponse(new URL("/", request.url), 303)
      },
    },
  },
})
