import type { CaptureDraft } from "@akasha/contracts"
import { storage } from "#imports"
import type { FolderOption } from "./akasha-api"
import type { CaptureOutboxJob } from "./outbox"

export const captureDraftStorage = storage.defineItem<CaptureDraft | null>("local:capture-draft", {
  fallback: null,
})

export const selectedFolderStorage = storage.defineItem<string | null>("local:selected-folder", {
  fallback: null,
})

export const captureOutboxStorage = storage.defineItem<CaptureOutboxJob[]>("local:capture-outbox", {
  fallback: [],
})

export const folderOptionsCacheStorage = storage.defineItem<{
  cachedAt: number
  folders: FolderOption[]
} | null>("local:folder-options-cache", { fallback: null })
