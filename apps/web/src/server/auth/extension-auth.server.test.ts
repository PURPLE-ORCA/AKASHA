import { describe, expect, it } from "vitest"

import {
  AKASHA_EXTENSION_ID,
  createExtensionCallbackUrl,
  requireExtensionRedirectUri,
} from "./extension-auth.server"

const redirectUri = `https://${AKASHA_EXTENSION_ID}.chromiumapp.org/oauth2`

describe("extension auth redirects", () => {
  it("accepts only the fixed Akasha extension redirect", () => {
    expect(requireExtensionRedirectUri(redirectUri)).toBe(redirectUri)
    expect(() =>
      requireExtensionRedirectUri("https://attacker.example/callback")
    ).toThrow("verify")
  })

  it("returns credentials in the URL fragment", () => {
    const callbackUrl = createExtensionCallbackUrl(redirectUri, {
      credential: "encrypted-credential",
    })

    expect(callbackUrl.origin).toBe(
      `https://${AKASHA_EXTENSION_ID}.chromiumapp.org`
    )
    expect(callbackUrl.search).toBe("")
    expect(callbackUrl.hash).toBe("#credential=encrypted-credential")
  })
})
