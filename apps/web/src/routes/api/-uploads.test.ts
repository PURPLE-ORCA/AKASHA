import { describe, expect, it } from "vitest"

import { isSameOriginUploadRequest } from "./uploads"

describe("isSameOriginUploadRequest", () => {
  it("accepts same-origin browser uploads", () => {
    const request = new Request("https://akasha.example/api/uploads", {
      headers: { Origin: "https://akasha.example" },
    })

    expect(isSameOriginUploadRequest(request)).toBe(true)
  })

  it("rejects missing and cross-origin upload requests", () => {
    expect(
      isSameOriginUploadRequest(
        new Request("https://akasha.example/api/uploads")
      )
    ).toBe(false)
    expect(
      isSameOriginUploadRequest(
        new Request("https://akasha.example/api/uploads", {
          headers: { Origin: "https://attacker.example" },
        })
      )
    ).toBe(false)
  })
})
