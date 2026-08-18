import type { CaptureDraft } from "@akasha/contracts"
import { storage } from "#imports"

export const captureDraftStorage = storage.defineItem<CaptureDraft | null>("local:capture-draft", {
  fallback: null,
})

export const selectedFolderStorage = storage.defineItem<string | null>("local:selected-folder", {
  fallback: null,
})
