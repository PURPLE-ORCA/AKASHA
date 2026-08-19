import type { CaptureDraft } from "@akasha/contracts"
import type { FolderOption } from "./akasha-api"

export type ExtensionRequest =
  | { type: "akasha:connect" }
  | { type: "akasha:list-folders" }
  | {
      type: "akasha:capture-video"
      descriptor: MediaDescriptor
    }
  | {
      type: "akasha:save"
      draft: CaptureDraft
      folderId: string
    }

export type ExtensionResponse<T> = { ok: true; value: T } | { ok: false; error: string }

export type OpenCapturePanelMessage = { type: "akasha:open-capture" }
export type GetMediaDescriptorMessage = { type: "akasha:get-media-descriptor" }
export type MediaDescriptor = {
  durationSeconds?: number
  height?: number
  mediaType: "video"
  mimeType?: string
  pageUrl?: string
  posterUrl?: string
  srcUrl: string
  visibleArea?: number
  width?: number
}

export async function callExtension<T>(request: ExtensionRequest) {
  const response = (await browser.runtime.sendMessage(request)) as ExtensionResponse<T>

  if (!response.ok) {
    throw new Error(response.error)
  }

  return response.value
}

export function connectLibrary() {
  return callExtension<FolderOption[]>({ type: "akasha:connect" })
}

export function getFolderOptions() {
  return callExtension<FolderOption[]>({ type: "akasha:list-folders" })
}

export function saveLibraryCapture(draft: CaptureDraft, folderId: string) {
  return callExtension<{ captureId: string }>({
    type: "akasha:save",
    draft,
    folderId,
  })
}
