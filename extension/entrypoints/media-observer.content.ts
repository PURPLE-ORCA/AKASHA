import { findLargestVisibleMedia, findSmallestMediaAtPoint } from "@/utils/media"
import type { GetMediaDescriptorMessage, MediaDescriptor } from "@/utils/messages"

export default defineContentScript({
  allFrames: true,
  matches: ["<all_urls>"],
  main(ctx) {
    let lastVideo: MediaDescriptor | null = null

    const rememberContextTarget = (event: MouseEvent) => {
      const pathVideo = event
        .composedPath()
        .find((target): target is HTMLVideoElement => target instanceof HTMLVideoElement)
      const video = pathVideo ?? findVideoAtPoint(event.clientX, event.clientY)

      if (!video) {
        lastVideo = null
        return
      }

      lastVideo = describeVideo(video)
    }

    const provideDescriptor = (message: GetMediaDescriptorMessage) => {
      if (message?.type !== "akasha:get-media-descriptor") return
      const visibleVideo = findLargestVisibleMedia(
        Array.from(document.querySelectorAll("video")),
        window.innerWidth,
        window.innerHeight
      )
      return Promise.resolve(lastVideo ?? (visibleVideo ? describeVideo(visibleVideo) : null))
    }

    document.addEventListener("contextmenu", rememberContextTarget, true)
    browser.runtime.onMessage.addListener(provideDescriptor)
    ctx.onInvalidated(() => {
      document.removeEventListener("contextmenu", rememberContextTarget, true)
      browser.runtime.onMessage.removeListener(provideDescriptor)
    })
  },
})

function findVideoAtPoint(clientX: number, clientY: number) {
  return findSmallestMediaAtPoint(Array.from(document.querySelectorAll("video")), clientX, clientY)
}

function describeVideo(video: HTMLVideoElement): MediaDescriptor | null {
  const srcUrl = video.currentSrc || video.src
  if (!srcUrl) return null

  const selectedSource = Array.from(video.querySelectorAll("source")).find(
    (source) => source.src === srcUrl
  )

  return {
    durationSeconds: Number.isFinite(video.duration) ? video.duration : undefined,
    height: video.videoHeight || undefined,
    mediaType: "video",
    mimeType: selectedSource?.type || undefined,
    posterUrl: video.poster || undefined,
    srcUrl,
    width: video.videoWidth || undefined,
  }
}
