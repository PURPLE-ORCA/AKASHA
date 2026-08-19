import { describe, expect, it } from "vitest"

import {
  extractEmbeddedVideoUrls,
  inferVideoMimeType,
  resolveDownloadableVideoUrl,
} from "./video-source"

describe("resolveDownloadableVideoUrl", () => {
  it("replaces a blob player URL with an embedded Pinterest MP4", () => {
    expect(
      resolveDownloadableVideoUrl({
        currentSrc: "blob:https://www.pinterest.com/player",
        embeddedUrls: [
          "https://v1.pinimg.com/videos/360p/example.mp4",
          "https://v1.pinimg.com/videos/720p/example.mp4",
        ],
      })
    ).toBe("https://v1.pinimg.com/videos/720p/example.mp4")
  })

  it("prefers a direct video source over unrelated page metadata", () => {
    expect(
      resolveDownloadableVideoUrl({
        currentSrc: "https://cdn.example.com/clip.webm",
        embeddedUrls: ["https://cdn.example.com/other.mp4"],
      })
    ).toBe("https://cdn.example.com/clip.webm")
  })

  it("does not classify manifests or blob URLs as downloadable files", () => {
    expect(
      resolveDownloadableVideoUrl({
        currentSrc: "blob:https://x.com/player",
        performanceUrls: ["https://video.twimg.com/clip/master.m3u8"],
      })
    ).toBeUndefined()
  })
})

describe("extractEmbeddedVideoUrls", () => {
  it("extracts JSON-escaped video URLs", () => {
    expect(
      extractEmbeddedVideoUrls(
        String.raw`{"url":"https:\/\/v1.pinimg.com\/videos\/720p\/clip.mp4?token=a\u0026b=c"}`
      )
    ).toEqual(["https://v1.pinimg.com/videos/720p/clip.mp4?token=a&b=c"])
  })
})

describe("inferVideoMimeType", () => {
  it("recognizes WebM and defaults downloadable clips to MP4", () => {
    expect(inferVideoMimeType("https://cdn.example.com/clip.webm")).toBe("video/webm")
    expect(inferVideoMimeType("https://cdn.example.com/clip.mp4?token=1")).toBe("video/mp4")
  })
})
