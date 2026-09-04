import { useSession } from "@tanstack/react-start/server"

import { getSessionSecret } from "../env.server"
import { getGoogleAccessToken } from "./google-oauth.server"

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

export async function getSessionGoogleCredentials(
  session: Awaited<ReturnType<typeof useStillroomSession>>
) {
  const refreshToken = session.data.googleRefreshToken
  if (!refreshToken) return null

  const activeToken = await getGoogleAccessToken({
    accessToken: session.data.googleAccessToken,
    accessTokenExpiresAt: session.data.googleAccessTokenExpiresAt,
    refreshToken,
  })
  if (!activeToken) return null

  if (
    activeToken.accessToken !== session.data.googleAccessToken ||
    activeToken.accessTokenExpiresAt !== session.data.googleAccessTokenExpiresAt
  ) {
    await session.update({
      ...session.data,
      googleAccessToken: activeToken.accessToken,
      googleAccessTokenExpiresAt: activeToken.accessTokenExpiresAt,
    })
  }

  return { ...activeToken, refreshToken }
}
