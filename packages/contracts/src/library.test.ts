import { describe, expect, it } from "vitest"

import { captureRequestSchema } from "./library"

describe("captureRequestSchema", () => {
  it("accepts a stable capture id and defaults the first attempt", () => {
    expect(
      captureRequestSchema.parse({
        captureId: "8e967b1b-8420-47a1-b116-20f37725a443",
        folderId: "folder",
        kind: "image",
        pageUrl: "https://example.com/inspiration",
        sourceUrl: "https://example.com/image.jpg",
        title: "Reference",
      })
    ).toMatchObject({
      attempt: 1,
      captureId: "8e967b1b-8420-47a1-b116-20f37725a443",
    })
  })
})
