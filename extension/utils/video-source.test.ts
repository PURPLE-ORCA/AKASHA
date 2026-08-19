import { describe, expect, it } from "vitest"

import {
  extractEmbeddedVideoUrls,
  inferVideoMimeType,
  resolveDownloadableVideoUrl,
  resolveXStatusUrl,
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

  it("prefers the embedded X post video over X interface animations", () => {
    expect(
      resolveDownloadableVideoUrl({
        currentSrc: "blob:https://x.com/player",
        embeddedUrls: [
          "https://video.twimg.com/amplify_video/123/vid/avc1/1152x720/post.mp4?tag=29",
        ],
        performanceUrls: ["https://pbs.twimg.com/static/money/x-card-animation-v4.mp4"],
      })
    ).toBe("https://video.twimg.com/amplify_video/123/vid/avc1/1152x720/post.mp4?tag=29")
  })

  it("does not classify manifests or blob URLs as downloadable files", () => {
    expect(
      resolveDownloadableVideoUrl({
        currentSrc: "blob:https://x.com/player",
        performanceUrls: ["https://video.twimg.com/clip/master.m3u8"],
      })
    ).toBeUndefined()
  })

  it("rejects X interface animations as capture media", () => {
    expect(
      resolveDownloadableVideoUrl({
        performanceUrls: [
          "https://abs.twimg.com/videos/grok-4-key-visual.mp4",
          "https://pbs.twimg.com/static/money/x-card-animation-v4.mp4",
        ],
      })
    ).toBeUndefined()
  })
})

describe("resolveXStatusUrl", () => {
  it("selects the tweet URL and ignores analytics or media-detail links", () => {
    expect(
      resolveXStatusUrl(
        [
          "/designer/status/1234567890/analytics",
          "/designer/status/1234567890/photo/1",
          "/designer/status/1234567890",
        ],
        "https://x.com/home"
      )
    ).toBe("https://x.com/designer/status/1234567890")
  })

  it("does not accept status-shaped links from another site", () => {
    expect(
      resolveXStatusUrl(["https://example.com/designer/status/1234567890"], "https://x.com/home")
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
