import { findLargestVisibleMedia, findSmallestMediaAtPoint } from "@/utils/media"
import type { GetMediaDescriptorMessage, MediaDescriptor } from "@/utils/messages"
import {
  extractEmbeddedVideoUrls,
  inferVideoMimeType,
  resolveDownloadableVideoUrl,
} from "@/utils/video-source"

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
      const descriptor = lastVideo ?? (visibleVideo ? describeVideo(visibleVideo) : null)
      return resolvePageVideoSource(descriptor).then((resolvedDescriptor) => {
        lastVideo = resolvedDescriptor
        return resolvedDescriptor
      })
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
  const currentSrc = video.currentSrc || video.src
  const sourceUrls = Array.from(video.querySelectorAll("source"))
    .map((source) => source.src)
    .filter(Boolean)
  const downloadableUrl = resolveDownloadableVideoUrl({
    currentSrc,
    embeddedUrls: collectEmbeddedVideoUrls(),
    performanceUrls: performance.getEntriesByType("resource").map((entry) => entry.name),
    sourceUrls,
  })
  const srcUrl = downloadableUrl ?? currentSrc
  if (!srcUrl) return null

  const selectedSource = Array.from(video.querySelectorAll("source")).find(
    (source) => source.src === srcUrl
  )

  return {
    durationSeconds: Number.isFinite(video.duration) ? video.duration : undefined,
    height: video.videoHeight || undefined,
    mediaType: "video",
    mimeType:
      selectedSource?.type || (downloadableUrl ? inferVideoMimeType(downloadableUrl) : undefined),
    posterUrl: video.poster || undefined,
    srcUrl,
    width: video.videoWidth || undefined,
  }
}

function collectEmbeddedVideoUrls() {
  const urls: string[] = []
  let inspectedCharacters = 0
  const maximumCharacters = 16_000_000

  for (const script of document.querySelectorAll("script")) {
    const text = script.textContent
    if (!text || inspectedCharacters >= maximumCharacters) break

    const remainingCharacters = maximumCharacters - inspectedCharacters
    const inspectedText = text.slice(0, remainingCharacters)
    inspectedCharacters += inspectedText.length
    urls.push(...extractEmbeddedVideoUrls(inspectedText))
  }

  return urls
}

async function resolvePageVideoSource(descriptor: MediaDescriptor | null) {
  if (!descriptor || ["http:", "https:"].includes(new URL(descriptor.srcUrl).protocol)) {
    return descriptor
  }

  try {
    const response = await fetch(location.href, {
      credentials: "include",
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) return descriptor

    const resolvedUrl = resolveDownloadableVideoUrl({
      embeddedUrls: extractEmbeddedVideoUrls(await response.text()),
    })
    return resolvedUrl
      ? {
          ...descriptor,
          mimeType: inferVideoMimeType(resolvedUrl),
          srcUrl: resolvedUrl,
        }
      : descriptor
  } catch {
    return descriptor
  }
}
