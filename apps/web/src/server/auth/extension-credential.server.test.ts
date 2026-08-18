import { describe, expect, it } from "vitest"

import {
  issueExtensionCredential,
  readExtensionCredential,
} from "./extension-credential.server"

const secret = "a-secure-session-secret-with-32-characters"

describe("extension credentials", () => {
  it("encrypts and reads a refresh token", () => {
    const credential = issueExtensionCredential("refresh-token", {
      now: 1_000,
      secret,
    })

    expect(credential).not.toContain("refresh-token")
    expect(
      readExtensionCredential(credential, { now: 2_000, secret }).refreshToken
    ).toBe("refresh-token")
  })

  it("retains a reusable access token and its expiry", () => {
    const credential = issueExtensionCredential(
      {
        accessToken: "access-token",
        accessTokenExpiresAt: 3_600_000,
        refreshToken: "refresh-token",
      },
      { now: 1_000, secret }
    )

    expect(
      readExtensionCredential(credential, { now: 2_000, secret })
    ).toMatchObject({
      accessToken: "access-token",
      accessTokenExpiresAt: 3_600_000,
      refreshToken: "refresh-token",
    })
  })

  it("rejects expired credentials", () => {
    const credential = issueExtensionCredential("refresh-token", {
      now: 1_000,
      secret,
    })

    expect(() =>
      readExtensionCredential(credential, {
        now: 91 * 24 * 60 * 60 * 1000,
        secret,
      })
    ).toThrow("invalid or expired")
  })

  it("rejects credentials encrypted with another secret", () => {
    const credential = issueExtensionCredential("refresh-token", {
      secret,
    })

    expect(() =>
      readExtensionCredential(credential, {
        secret: "another-secure-session-secret-with-32-characters",
      })
    ).toThrow("invalid or expired")
  })
})
