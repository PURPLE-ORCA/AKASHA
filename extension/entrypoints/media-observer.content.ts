import type { GetMediaDescriptorMessage, MediaDescriptor } from "@/utils/messages"

export default defineContentScript({
  allFrames: true,
  matches: ["<all_urls>"],
  main(ctx) {
    let lastVideo: MediaDescriptor | null = null

    const rememberContextTarget = (event: MouseEvent) => {
      const video = event
        .composedPath()
        .find((target): target is HTMLVideoElement => target instanceof HTMLVideoElement)

      if (!video) {
        lastVideo = null
        return
      }

      const srcUrl = video.currentSrc || video.src
      if (!srcUrl) {
        lastVideo = null
        return
      }

      const selectedSource = Array.from(video.querySelectorAll("source")).find(
        (source) => source.src === srcUrl
      )

      lastVideo = {
        durationSeconds: Number.isFinite(video.duration) ? video.duration : undefined,
        height: video.videoHeight || undefined,
        mediaType: "video",
        mimeType: selectedSource?.type || undefined,
        posterUrl: video.poster || undefined,
        srcUrl,
        width: video.videoWidth || undefined,
      }
    }

    const provideDescriptor = (message: GetMediaDescriptorMessage) => {
      if (message?.type !== "akasha:get-media-descriptor") return
      return Promise.resolve(lastVideo)
    }

    document.addEventListener("contextmenu", rememberContextTarget, true)
    browser.runtime.onMessage.addListener(provideDescriptor)
    ctx.onInvalidated(() => {
      document.removeEventListener("contextmenu", rememberContextTarget, true)
      browser.runtime.onMessage.removeListener(provideDescriptor)
    })
  },
})
