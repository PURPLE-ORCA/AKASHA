import type { CaptureDraft } from "@akasha/contracts"
import { captureDraftSchema } from "@akasha/contracts"

type CaptureContext = {
  height?: number
  mediaType?: string
  pageUrl?: string
  srcUrl?: string
  width?: number
}

export function createCaptureDraft(
  context: CaptureContext,
  tabTitle?: string
): CaptureDraft | null {
  if (!context.pageUrl || !context.srcUrl || context.mediaType === "video") {
    return null
  }

  const sourceHost = new URL(context.pageUrl).hostname.replace(/^www\./, "")

  return captureDraftSchema.parse({
    height: context.height,
    kind: "image",
    pageUrl: context.pageUrl,
    sourceUrl: context.srcUrl,
    storageMode: "binary",
    thumbnailUrl: context.srcUrl,
    title: tabTitle?.trim() || `Saved from ${sourceHost}`,
    width: context.width,
  })
}
