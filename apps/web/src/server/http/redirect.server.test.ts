import { describe, expect, it } from "vitest"

import { createRedirectResponse } from "./redirect.server"

describe("createRedirectResponse", () => {
  it("creates a mutable redirect response for the server runtime", () => {
    const response = createRedirectResponse("https://example.com/next", 303)

    response.headers.set("Cache-Control", "no-store")

    expect(response.status).toBe(303)
    expect(response.headers.get("Location")).toBe("https://example.com/next")
    expect(response.headers.get("Cache-Control")).toBe("no-store")
  })
})
