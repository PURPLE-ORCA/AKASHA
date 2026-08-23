import { describe, expect, it } from "vitest"

import {
  captureOutcomeSchema,
  captureRequestSchema,
  libraryUploadMimeTypeSchema,
  maximumLibraryUploadBytes,
} from "./library"

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

describe("library upload policy", () => {
  it("accepts supported image types and rejects active image documents", () => {
    expect(libraryUploadMimeTypeSchema.parse("image/webp")).toBe("image/webp")
    expect(libraryUploadMimeTypeSchema.safeParse("image/svg+xml").success).toBe(false)
    expect(maximumLibraryUploadBytes).toBe(20 * 1024 * 1024)
  })
})
