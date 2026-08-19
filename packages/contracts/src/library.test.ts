import { describe, expect, it } from "vitest"

import { captureOutcomeSchema, captureRequestSchema } from "./library"

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

  it("accepts a direct video descriptor", () => {
    expect(
      captureRequestSchema.parse({
        folderId: "folder",
        kind: "video",
        storageMode: "binary",
        pageUrl: "https://example.com/showcase",
        sourceUrl: "https://cdn.example.com/interaction.mp4",
        thumbnailUrl: "https://cdn.example.com/poster.jpg",
        durationSeconds: 12.4,
        width: 1280,
        height: 720,
        title: "Interaction",
      })
    ).toMatchObject({
      kind: "video",
      storageMode: "binary",
      durationSeconds: 12.4,
    })
  })
})

describe("captureOutcomeSchema", () => {
  it("distinguishes new captures from existing library items", () => {
    expect(captureOutcomeSchema.parse("saved")).toBe("saved")
    expect(captureOutcomeSchema.parse("already_saved")).toBe("already_saved")
  })
})
