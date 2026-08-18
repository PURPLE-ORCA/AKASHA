import {
  issueExtensionCredential,
  readExtensionCredential,
} from "./extension-credential.server"
import type { GoogleTokenCredentials } from "./google-oauth.server"
import { getGoogleAccessToken } from "./google-oauth.server"

export const AKASHA_EXTENSION_ID = "cooplhaddmnookoploidbemfjdacgnoh"
const EXTENSION_REDIRECT_URI = `https://${AKASHA_EXTENSION_ID}.chromiumapp.org/oauth2`

export function requireExtensionRedirectUri(value: string | null) {
  if (value !== EXTENSION_REDIRECT_URI) {
    throw new Error("Akasha Capture could not verify its redirect address.")
  }

  return value
}

export function createExtensionCallbackUrl(
  redirectUri: string,
  result: { credential: string } | { error: "authorization_failed" }
) {
  const callbackUrl = new URL(requireExtensionRedirectUri(redirectUri))
  const params = new URLSearchParams(result)
  callbackUrl.hash = params.toString()
  return callbackUrl
}

export function createExtensionCredentialCallback(
  redirectUri: string,
  credentials: GoogleTokenCredentials | string
) {
  return createExtensionCallbackUrl(redirectUri, {
    credential: issueExtensionCredential(credentials),
  })
}

export function requireExtensionGoogleCredentials(request: Request) {
  const authorization = request.headers.get("Authorization")

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Akasha authorization is required.")
  }

  return readExtensionCredential(authorization.slice("Bearer ".length))
}

export async function resolveExtensionGoogleCredentials(request: Request) {
  const credentials = requireExtensionGoogleCredentials(request)
  const activeToken = await getGoogleAccessToken(credentials)

  if (!activeToken) {
    throw new Error("Akasha authorization is invalid or expired.")
  }

  return {
    ...activeToken,
    refreshToken: credentials.refreshToken,
  }
}

export function setExtensionCredentialHeader(
  headers: Headers,
  credentials: GoogleTokenCredentials
) {
  headers.set("X-Akasha-Credential", issueExtensionCredential(credentials))
}

export function createExtensionApiHeaders(request: Request) {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    Vary: "Authorization, Origin",
  })
  const origin = request.headers.get("Origin")

  if (origin === `chrome-extension://${AKASHA_EXTENSION_ID}`) {
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type")
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    headers.set("Access-Control-Allow-Origin", origin)
    headers.set(
      "Access-Control-Expose-Headers",
      "Server-Timing, X-Akasha-Credential"
    )
  }

  return headers
}
