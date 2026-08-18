import { useSession } from "@tanstack/react-start/server"

import { getSessionSecret } from "../env.server"

export type StillroomSessionData = {
  extensionRedirectUri?: string
  googleAccessToken?: string
  googleAccessTokenExpiresAt?: number
  googleRefreshToken?: string
  oauthState?: string
}

export function useStillroomSession() {
  return useSession<StillroomSessionData>({
    maxAge: 90 * 24 * 60 * 60,
    name: "stillroom-session",
    password: getSessionSecret(),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
}
