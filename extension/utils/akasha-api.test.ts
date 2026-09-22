import { describe, expect, it } from "vitest"

import {
  AkashaApiError,
  createAkashaAuthorizationUrl,
  normalizeFolderOptions,
  parseAkashaAuthorizationResponse,
} from "./akasha-api"

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

describe("folder options", () => {
  it("accepts both current depth values and legacy indented labels", () => {
    expect(
      normalizeFolderOptions([
        { id: "current", label: "Current", depth: 1 },
        { id: "legacy", label: "— — Legacy" },
      ])
    ).toEqual([
      { id: "current", label: "Current", depth: 1 },
      { id: "legacy", label: "Legacy", depth: 2 },
    ])
  })
})

describe("Akasha API errors", () => {
  it("retries only transient response classes", () => {
    expect(new AkashaApiError("Unavailable", 502).retryable).toBe(true)
    expect(new AkashaApiError("Too many requests", 429).retryable).toBe(true)
    expect(new AkashaApiError("Invalid capture", 422).retryable).toBe(false)
  })
})
