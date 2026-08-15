import { describe, expect, it } from "vitest"

import { parseServerEnv } from "./env.server"

const validEnvironment = {
  GOOGLE_CLIENT_ID: "stillroom-client-id",
  GOOGLE_CLIENT_SECRET: "stillroom-client-secret",
  GOOGLE_REDIRECT_URI: "http://localhost:3000/api/auth/google/callback",
  SESSION_SECRET: "a-secure-session-secret-with-32-characters",
}

describe("parseServerEnv", () => {
  it("accepts a complete server configuration", () => {
    expect(parseServerEnv(validEnvironment)).toEqual(validEnvironment)
  })

  it("rejects a short session secret", () => {
    expect(() =>
      parseServerEnv({ ...validEnvironment, SESSION_SECRET: "too-short" })
    ).toThrow()
  })
})
