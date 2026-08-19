import type { CaptureDraft } from "@akasha/contracts"
import { captureDraftSchema } from "@akasha/contracts"

type CaptureContext = {
  durationSeconds?: number
  height?: number
  mediaType?: string
  mimeType?: string
  pageUrl?: string
  posterUrl?: string
  srcUrl?: string
  width?: number
}

export function createCaptureDraft(
  context: CaptureContext,
  tabTitle?: string
): CaptureDraft | null {
  if (!context.pageUrl || !context.srcUrl) {
    return null
  }

  const kind = context.mediaType === "video" ? "video" : "image"
  const sourceHost = new URL(context.pageUrl).hostname.replace(/^www\./, "")
  const storageMode =
    kind === "video" ? classifyVideoStorage(context.srcUrl, context.mimeType) : "binary"
  const thumbnailUrl =
    kind === "image"
      ? context.srcUrl
      : isRemoteHttpUrl(context.posterUrl)
        ? context.posterUrl
        : undefined

  return captureDraftSchema.parse({
    durationSeconds: context.durationSeconds,
    height: context.height,
    kind,
    pageUrl: context.pageUrl,
    sourceUrl: context.srcUrl,
    storageMode,
    thumbnailUrl,
    title: tabTitle?.trim() || `Saved from ${sourceHost}`,
    width: context.width,
  })
}

function classifyVideoStorage(sourceUrl: string, mimeType?: string) {
  if (!isRemoteHttpUrl(sourceUrl)) return "reference" as const

  const normalizedMimeType = mimeType?.split(";")[0]?.trim().toLowerCase()
  if (
    ["application/dash+xml", "application/vnd.apple.mpegurl", "application/x-mpegurl"].includes(
      normalizedMimeType ?? ""
    )
  ) {
    return "reference" as const
  }

  const pathname = new URL(sourceUrl).pathname.toLowerCase()
  return pathname.endsWith(".m3u8") || pathname.endsWith(".mpd")
    ? ("reference" as const)
    : ("binary" as const)
}

function isRemoteHttpUrl(value?: string) {
  if (!value) return false

  try {
    return ["http:", "https:"].includes(new URL(value).protocol)
  } catch {
    return false
  }
}
