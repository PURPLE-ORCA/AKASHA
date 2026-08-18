import { google } from "googleapis"

import { getServerEnv } from "../env.server"

const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file"
const ACCESS_TOKEN_EXPIRY_BUFFER_MS = 60_000

export type GoogleTokenCredentials = {
  accessToken?: string
  accessTokenExpiresAt?: number
  refreshToken: string
}

export function createGoogleOAuthClient() {
  const environment = getServerEnv()

  return new google.auth.OAuth2(
    environment.GOOGLE_CLIENT_ID,
    environment.GOOGLE_CLIENT_SECRET,
    environment.GOOGLE_REDIRECT_URI
  )
}

export function createGoogleAuthorizationUrl(state: string) {
  return createGoogleOAuthClient().generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: [DRIVE_FILE_SCOPE],
    state,
  })
}

export async function getGoogleAccessToken({
  accessToken,
  accessTokenExpiresAt,
  refreshToken,
}: GoogleTokenCredentials) {
  if (
    accessToken &&
    accessTokenExpiresAt &&
    accessTokenExpiresAt > Date.now() + ACCESS_TOKEN_EXPIRY_BUFFER_MS
  ) {
    return { accessToken, accessTokenExpiresAt }
  }

  const oauthClient = createGoogleOAuthClient()
  oauthClient.setCredentials({ refresh_token: refreshToken })
  const refreshedToken = await oauthClient.getAccessToken()

  if (!refreshedToken.token) return null

  return {
    accessToken: refreshedToken.token,
    accessTokenExpiresAt:
      oauthClient.credentials.expiry_date ?? Date.now() + 3_600_000,
  }
}
