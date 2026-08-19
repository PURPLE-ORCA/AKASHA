import {
  findLargestVisibleMedia,
  findSmallestMediaAtPoint,
  getMediaActionPosition,
  getVisibleArea,
} from "@/utils/media"
import type {
  ExtensionRequest,
  ExtensionResponse,
  GetMediaDescriptorMessage,
  MediaDescriptor,
} from "@/utils/messages"
import {
  extractEmbeddedVideoUrls,
  inferVideoMimeType,
  resolveDownloadableVideoUrl,
  resolveXStatusUrl,
} from "@/utils/video-source"

export default defineContentScript({
  allFrames: true,
  matches: ["<all_urls>"],
  main(ctx) {
    const observerScope = globalThis as typeof globalThis & {
      __akashaMediaObserverInstalled?: boolean
    }
    if (observerScope.__akashaMediaObserverInstalled) return
    observerScope.__akashaMediaObserverInstalled = true

    let lastVideo: MediaDescriptor | null = null
    let lastVideoElement: HTMLVideoElement | null = null
    let activeVideo: HTMLVideoElement | null = null
    let resetLabelTimer: ReturnType<typeof setTimeout> | null = null
    const { button, host } = createVideoAction()

    const rememberContextTarget = (event: MouseEvent) => {
      const pathVideo = event
        .composedPath()
        .find((target): target is HTMLVideoElement => target instanceof HTMLVideoElement)
      const video = pathVideo ?? findVideoAtPoint(event.clientX, event.clientY)

      if (!video) {
        lastVideo = null
        lastVideoElement = null
        return
      }

      lastVideo = describeVideo(video)
      lastVideoElement = video
    }

    const provideDescriptor = (message: GetMediaDescriptorMessage) => {
      if (message?.type !== "akasha:get-media-descriptor") return
      const visibleVideo = findLargestVisibleMedia(
        Array.from(document.querySelectorAll("video")),
        window.innerWidth,
        window.innerHeight
      )
      const targetVideo = lastVideoElement ?? visibleVideo
      const descriptor = lastVideo ?? (targetVideo ? describeVideo(targetVideo) : null)
      return resolvePageVideoSource(descriptor, targetVideo).then((resolvedDescriptor) => {
        lastVideo = resolvedDescriptor
        return resolvedDescriptor
      })
    }

    const positionAction = () => {
      if (!activeVideo || !document.contains(activeVideo)) {
        hideAction()
        return
      }

      const rect = activeVideo.getBoundingClientRect()
      if (rect.width < 180 || rect.height < 100) {
        hideAction()
        return
      }

      const position = getMediaActionPosition(rect, {
        actionHeight: 36,
        actionWidth: 132,
        inset: 12,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      })
      button.style.left = `${position.left}px`
      button.style.top = `${position.top}px`
      button.hidden = false
    }

    const hideAction = () => {
      activeVideo = null
      button.hidden = true
    }

    const trackVideo = (event: PointerEvent) => {
      const video = findVideoAtPoint(event.clientX, event.clientY)
      if (!video) {
        hideAction()
        return
      }

      activeVideo = video
      positionAction()
    }

    const captureVideo = async (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (!activeVideo || button.disabled) return

      button.disabled = true
      setActionLabel(button, "Opening…")

      try {
        const descriptor = await resolvePageVideoSource(describeVideo(activeVideo), activeVideo)
        if (!descriptor) throw new Error("Video unavailable")

        const request: ExtensionRequest = {
          descriptor,
          type: "akasha:capture-video",
        }
        const response = (await browser.runtime.sendMessage(request)) as ExtensionResponse<null>
        if (!response.ok) throw new Error(response.error)
        setActionLabel(button, "Ready")
      } catch {
        setActionLabel(button, "Try again")
      } finally {
        button.disabled = false
        if (resetLabelTimer) clearTimeout(resetLabelTimer)
        resetLabelTimer = setTimeout(() => setActionLabel(button, "Save to Akasha"), 1_500)
      }
    }

    const mountTarget = document.body ?? document.documentElement
    mountTarget.append(host)
    document.addEventListener("contextmenu", rememberContextTarget, true)
    document.addEventListener("pointermove", trackVideo, true)
    window.addEventListener("resize", positionAction)
    window.addEventListener("scroll", positionAction, true)
    button.addEventListener("click", captureVideo)
    browser.runtime.onMessage.addListener(provideDescriptor)
    ctx.onInvalidated(() => {
      document.removeEventListener("contextmenu", rememberContextTarget, true)
      document.removeEventListener("pointermove", trackVideo, true)
      window.removeEventListener("resize", positionAction)
      window.removeEventListener("scroll", positionAction, true)
      button.removeEventListener("click", captureVideo)
      browser.runtime.onMessage.removeListener(provideDescriptor)
      if (resetLabelTimer) clearTimeout(resetLabelTimer)
      host.remove()
      delete observerScope.__akashaMediaObserverInstalled
    })
  },
})

function createVideoAction() {
  const host = document.createElement("div")
  host.dataset.akashaVideoAction = ""
  const shadow = host.attachShadow({ mode: "open" })
  const style = document.createElement("style")
  style.textContent = `
    :host {
      all: initial;
      display: block;
      inset: 0;
      pointer-events: none;
      position: fixed;
      z-index: 2147483647;
    }
    button {
      align-items: center;
      backdrop-filter: blur(14px);
      background: rgba(18, 18, 20, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 999px;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.32);
      color: #fff;
      cursor: pointer;
      display: flex;
      font: 600 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      gap: 7px;
      height: 36px;
      justify-content: center;
      left: 0;
      padding: 0 13px;
      pointer-events: auto;
      position: fixed;
      top: 0;
      transition: background 140ms ease, border-color 140ms ease, transform 140ms ease;
      width: 132px;
      z-index: 2147483647;
    }
    button:hover { background: rgba(28, 28, 31, 0.96); border-color: rgba(255, 255, 255, 0.3); }
    button:active { transform: scale(0.97); }
    button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    button:disabled { cursor: wait; opacity: 0.78; }
    button[hidden] { display: none; }
    .mark { background: #fff; border-radius: 50%; height: 7px; width: 7px; }
  `
  const button = document.createElement("button")
  button.hidden = true
  button.type = "button"
  button.setAttribute("aria-label", "Save video to Akasha")
  button.innerHTML = '<span class="mark" aria-hidden="true"></span><span>Save to Akasha</span>'
  shadow.append(style, button)
  return { button, host }
}

function setActionLabel(button: HTMLButtonElement, label: string) {
  const labelElement = button.querySelector("span:last-child")
  if (labelElement) labelElement.textContent = label
}

function findVideoAtPoint(clientX: number, clientY: number) {
  return findSmallestMediaAtPoint(Array.from(document.querySelectorAll("video")), clientX, clientY)
}

function describeVideo(video: HTMLVideoElement): MediaDescriptor | null {
  const currentSrc = video.currentSrc || video.src
  const sourceUrls = Array.from(video.querySelectorAll("source"))
    .map((source) => source.src)
    .filter(Boolean)
  if (isDedicatedXStatusPage() || !isXPage()) sourceUrls.push(...collectMetadataVideoUrls())
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
    visibleArea: getVisibleArea(
      video.getBoundingClientRect(),
      window.innerWidth,
      window.innerHeight
    ),
    width: video.videoWidth || undefined,
  }
}

function collectMetadataVideoUrls() {
  return Array.from(
    document.querySelectorAll<HTMLMetaElement | HTMLLinkElement>(
      'meta[itemprop="contentUrl"], meta[property="og:video"], meta[property="og:video:url"], link[rel="preload"][as="video"]'
    )
  )
    .map((element) => (element instanceof HTMLMetaElement ? element.content : element.href))
    .filter(Boolean)
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

async function resolvePageVideoSource(
  descriptor: MediaDescriptor | null,
  video: HTMLVideoElement | null = null
) {
  if (!descriptor) return null

  const xStatusUrl = video ? findClosestXStatusUrl(video) : undefined
  if (isXPage()) {
    if (xStatusUrl) return resolveXVideoSource(descriptor, xStatusUrl)
    if (
      ["http:", "https:"].includes(new URL(descriptor.srcUrl).protocol) &&
      new URL(descriptor.srcUrl).hostname === "video.twimg.com"
    ) {
      return descriptor
    }
    return null
  }

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

async function resolveXVideoSource(descriptor: MediaDescriptor, statusUrl: string) {
  try {
    const response = await fetch(statusUrl, {
      // X's authenticated app shell keeps tweet media in an encoded client
      // payload. The public status response exposes the post's MP4 variants.
      credentials: "omit",
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) return null

    const resolvedUrl = resolveDownloadableVideoUrl({
      embeddedUrls: extractEmbeddedVideoUrls(await response.text()),
    })
    if (!resolvedUrl || new URL(resolvedUrl).hostname !== "video.twimg.com") return null

    return {
      ...descriptor,
      mimeType: inferVideoMimeType(resolvedUrl),
      pageUrl: statusUrl,
      srcUrl: resolvedUrl,
    }
  } catch {
    return null
  }
}

function findClosestXStatusUrl(video: HTMLVideoElement) {
  if (!isXPage()) return undefined

  let container: Element | null = video
  for (let depth = 0; container && depth < 10; depth += 1) {
    const statusUrl = resolveXStatusUrl(
      Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]')).map(
        (anchor) => anchor.href
      ),
      location.href
    )
    if (statusUrl) return statusUrl
    container = container.parentElement
  }

  return isDedicatedXStatusPage() ? resolveXStatusUrl([location.href], location.href) : undefined
}

function isDedicatedXStatusPage() {
  return Boolean(resolveXStatusUrl([location.href], location.href))
}

function isXPage() {
  return location.hostname === "x.com" || location.hostname === "www.x.com"
}
