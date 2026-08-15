import { describe, expect, it } from "vitest"

import { createGoogleAuthorizationUrl, parseGoogleAuthorizationResponse } from "./google-oauth"

describe("Google extension OAuth", () => {
  it("creates an interactive token request for the extension redirect", () => {
    const url = new URL(
      createGoogleAuthorizationUrl({
        clientId: "client-id",
        interactive: true,
        redirectUrl: "https://extension-id.chromiumapp.org/oauth2",
        state: "state",
      })
    )

    expect(url.origin).toBe("https://accounts.google.com")
    expect(url.searchParams.get("client_id")).toBe("client-id")
    expect(url.searchParams.get("prompt")).toBe("consent")
    expect(url.searchParams.get("redirect_uri")).toBe("https://extension-id.chromiumapp.org/oauth2")
    expect(url.searchParams.get("response_type")).toBe("token")
    expect(url.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/drive.file")
    expect(url.searchParams.get("state")).toBe("state")
  })

  it("validates and reads Google's fragment response", () => {
    expect(
      parseGoogleAuthorizationResponse(
        "https://extension-id.chromiumapp.org/oauth2#access_token=token&expires_in=3600&state=state",
        "state"
      )
    ).toEqual({ accessToken: "token", expiresIn: 3600 })
  })

  it("rejects a response with the wrong state", () => {
    expect(() =>
      parseGoogleAuthorizationResponse(
        "https://extension-id.chromiumapp.org/oauth2#access_token=token&state=unexpected",
        "state"
      )
    ).toThrow("could not be verified")
  })
})
