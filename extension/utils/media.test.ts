import { describe, expect, it } from "vitest"

import { findLargestVisibleMedia, findSmallestMediaAtPoint, getMediaActionPosition } from "./media"

function media(left: number, top: number, width: number, height: number) {
  return {
    getBoundingClientRect: () => ({
      bottom: top + height,
      height,
      left,
      right: left + width,
      top,
      width,
    }),
  }
}

describe("findSmallestMediaAtPoint", () => {
  it("finds a video underneath a separate overlay target", () => {
    const video = media(100, 50, 640, 360)

    expect(findSmallestMediaAtPoint([video], 320, 200)).toBe(video)
  })

  it("prefers the most specific nested video", () => {
    const background = media(0, 0, 1200, 800)
    const postVideo = media(100, 50, 640, 360)

    expect(findSmallestMediaAtPoint([background, postVideo], 320, 200)).toBe(postVideo)
  })

  it("ignores media outside the context-menu coordinates", () => {
    expect(findSmallestMediaAtPoint([media(100, 50, 640, 360)], 20, 20)).toBeUndefined()
  })
})

describe("findLargestVisibleMedia", () => {
  it("recovers the prominent video when an observer is injected after the context menu event", () => {
    const clippedBackground = media(-1_000, 0, 1_100, 800)
    const postVideo = media(100, 50, 640, 360)

    expect(findLargestVisibleMedia([clippedBackground, postVideo], 1_200, 800)).toBe(postVideo)
  })

  it("ignores videos outside the viewport", () => {
    expect(findLargestVisibleMedia([media(2_000, 0, 640, 360)], 1_200, 800)).toBeUndefined()
  })
})

describe("getMediaActionPosition", () => {
  it("places the action inside the video's top-right corner", () => {
    expect(
      getMediaActionPosition(media(100, 50, 640, 360).getBoundingClientRect(), {
        actionHeight: 36,
        actionWidth: 132,
        inset: 12,
        viewportHeight: 800,
        viewportWidth: 1_200,
      })
    ).toEqual({ left: 596, top: 62 })
  })

  it("keeps the action inside the viewport when the video is clipped", () => {
    expect(
      getMediaActionPosition(media(1_100, -30, 300, 200).getBoundingClientRect(), {
        actionHeight: 36,
        actionWidth: 132,
        inset: 12,
        viewportHeight: 800,
        viewportWidth: 1_200,
      })
    ).toEqual({ left: 1_056, top: 12 })
  })
})
