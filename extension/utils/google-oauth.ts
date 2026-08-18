const AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file"
const AUTH_STORAGE_KEY = "stillroomGoogleAuth"
const TOKEN_EXPIRY_BUFFER_MS = 60_000

type StoredGoogleAuth = {
  accessToken: string
  expiresAt: number
}

export async function getGoogleAccessToken(interactive: boolean) {
  const storedAuth = await readStoredAuth()

  if (storedAuth && storedAuth.expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER_MS) {
    return storedAuth.accessToken
  }

  if (!interactive) {
    throw new Error("Connect Google Drive to continue.")
  }

  return authorizeWithWebFlow(interactive)
}

export function createGoogleAuthorizationUrl({
  clientId,
  interactive,
  redirectUrl,
  state,
}: {
  clientId: string
  interactive: boolean
  redirectUrl: string
  state: string
}) {
  const url = new URL(AUTHORIZATION_URL)
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("include_granted_scopes", "true")
  url.searchParams.set("prompt", interactive ? "consent" : "none")
  url.searchParams.set("redirect_uri", redirectUrl)
  url.searchParams.set("response_type", "token")
  url.searchParams.set("scope", DRIVE_SCOPE)
  url.searchParams.set("state", state)
  return url.toString()
}

export function parseGoogleAuthorizationResponse(responseUrl: string, expectedState: string) {
  const response = new URL(responseUrl)
  const params = new URLSearchParams(response.hash.slice(1))

  if (params.get("state") !== expectedState) {
    throw new Error("Google authorization could not be verified.")
  }

  const accessToken = params.get("access_token")

  if (params.get("error") || !accessToken) {
    throw new Error("Google authorization was not completed.")
  }

  return {
    accessToken,
    expiresIn: Number(params.get("expires_in")) || 3600,
  }
}

async function authorizeWithWebFlow(interactive: boolean) {
  const state = createRandomValue(32)
  const authorizationUrl = createGoogleAuthorizationUrl({
    clientId: requireGoogleWebClientId(),
    interactive,
    redirectUrl: browser.identity.getRedirectURL("oauth2"),
    state,
  })
  const responseUrl = await browser.identity.launchWebAuthFlow({
    interactive,
    url: authorizationUrl,
  })

  if (!responseUrl) {
    throw new Error("Google authorization was cancelled.")
  }

  const token = parseGoogleAuthorizationResponse(responseUrl, state)
  const auth: StoredGoogleAuth = {
    accessToken: token.accessToken,
    expiresAt: Date.now() + token.expiresIn * 1000,
  }
  await browser.storage.local.set({ [AUTH_STORAGE_KEY]: auth })
  return auth.accessToken
}

async function readStoredAuth() {
  const result = await browser.storage.local.get(AUTH_STORAGE_KEY)
  return result[AUTH_STORAGE_KEY] as StoredGoogleAuth | undefined
}

function requireGoogleWebClientId() {
  const clientId = import.meta.env.WXT_GOOGLE_WEB_CLIENT_ID

  if (!clientId) {
    throw new Error("Google authorization is unavailable.")
  }

  return clientId
}

function createRandomValue(byteLength: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  let binary = ""

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
