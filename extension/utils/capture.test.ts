import { describe, expect, it } from "vitest"

import { createCaptureDraft } from "./capture"

describe("createCaptureDraft", () => {
  it("creates an image draft from a context-menu capture", () => {
    const draft = createCaptureDraft(
      {
        mediaType: "image",
        pageUrl: "https://example.com/inspiration",
        srcUrl: "https://example.com/image.jpg",
      },
      "A useful composition"
    )

    expect(draft).toMatchObject({
      kind: "image",
      title: "A useful composition",
      thumbnailUrl: "https://example.com/image.jpg",
    })
  })

  it("ignores captures without a usable media URL", () => {
    expect(createCaptureDraft({ pageUrl: "https://example.com" }, "Missing media")).toBeNull()
  })

  it("captures a direct video with playback metadata", () => {
    expect(
      createCaptureDraft(
        {
          durationSeconds: 8.5,
          height: 720,
          mediaType: "video",
          pageUrl: "https://example.com/showcase",
          posterUrl: "https://cdn.example.com/poster.jpg",
          srcUrl: "https://cdn.example.com/micro-interaction.mp4",
          width: 1280,
        },
        "Micro interaction"
      )
    ).toMatchObject({
      durationSeconds: 8.5,
      kind: "video",
      storageMode: "binary",
      thumbnailUrl: "https://cdn.example.com/poster.jpg",
    })
  })

  it("keeps manifests and browser-local media as references", () => {
    const base = {
      mediaType: "video",
      pageUrl: "https://example.com/showcase",
    }

    expect(
      createCaptureDraft({ ...base, srcUrl: "https://cdn.example.com/stream.m3u8" }, "HLS")
    ).toMatchObject({ storageMode: "reference" })
    expect(
      createCaptureDraft({ ...base, srcUrl: "blob:https://example.com/video" }, "Blob")
    ).toMatchObject({ storageMode: "reference" })
  })
})
