import { google } from "googleapis"

import { getServerEnv } from "../env.server"

const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file"

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
