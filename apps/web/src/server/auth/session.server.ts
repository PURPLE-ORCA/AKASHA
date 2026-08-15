import { useSession } from "@tanstack/react-start/server"

import { getSessionSecret } from "../env.server"

export type StillroomSessionData = {
  googleRefreshToken?: string
  oauthState?: string
}

export function useStillroomSession() {
  return useSession<StillroomSessionData>({
    name: "stillroom-session",
    password: getSessionSecret(),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
}
