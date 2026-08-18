import { describe, expect, it } from "vitest"

import { createAkashaAuthorizationUrl, parseAkashaAuthorizationResponse } from "./akasha-api"

describe("Akasha extension authorization", () => {
  it("starts authorization through the Akasha backend", () => {
    const url = new URL(
      createAkashaAuthorizationUrl(
        "http://localhost:3000",
        "https://extension-id.chromiumapp.org/oauth2"
      )
    )

    expect(url.origin).toBe("http://localhost:3000")
    expect(url.pathname).toBe("/api/extension/auth")
    expect(url.searchParams.get("redirect_uri")).toBe("https://extension-id.chromiumapp.org/oauth2")
  })

  it("reads the encrypted device credential from the callback", () => {
    expect(
      parseAkashaAuthorizationResponse(
        "https://extension-id.chromiumapp.org/oauth2#credential=sealed-token"
      )
    ).toBe("sealed-token")
  })

  it("rejects failed callbacks", () => {
    expect(() =>
      parseAkashaAuthorizationResponse(
        "https://extension-id.chromiumapp.org/oauth2#error=authorization_failed"
      )
    ).toThrow("not completed")
  })
})
