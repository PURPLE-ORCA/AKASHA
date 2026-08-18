import {
  issueExtensionCredential,
  readExtensionCredential,
} from "./extension-credential.server"

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
  refreshToken: string
) {
  return createExtensionCallbackUrl(redirectUri, {
    credential: issueExtensionCredential(refreshToken),
  })
}

export function requireExtensionRefreshToken(request: Request) {
  const authorization = request.headers.get("Authorization")

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Akasha authorization is required.")
  }

  return readExtensionCredential(authorization.slice("Bearer ".length))
    .refreshToken
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
  }

  return headers
}
