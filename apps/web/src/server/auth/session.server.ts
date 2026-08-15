import { useSession } from "@tanstack/react-start/server"

import { getServerEnv } from "../env.server"

export type StillroomSessionData = {
  googleRefreshToken?: string
  oauthState?: string
}

export function useStillroomSession() {
  const environment = getServerEnv()

  return useSession<StillroomSessionData>({
    name: "stillroom-session",
    password: environment.SESSION_SECRET,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
}
