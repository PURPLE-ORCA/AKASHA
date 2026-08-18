import { connectAkasha, listFolderOptions, saveCapture } from "@/utils/akasha-api"
import { createCaptureDraft } from "@/utils/capture"
import type { ExtensionRequest, ExtensionResponse, OpenCapturePanelMessage } from "@/utils/messages"
import { captureDraftStorage } from "@/utils/storage"

const CAPTURE_MENU_ID = "stillroom-capture-media"

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      contexts: ["image", "video"],
      id: CAPTURE_MENU_ID,
      title: "Save to Akasha",
    })
  })

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== CAPTURE_MENU_ID) {
      return
    }

    const draft = createCaptureDraft(info, tab?.title)

    if (!draft) {
      await showCaptureNotification(
        "Could not capture this item",
        "Open the original image or video and try again."
      )
      return
    }

    await captureDraftStorage.setValue(draft)

    await openCapturePanel(tab?.id)
  })

  browser.action.onClicked.addListener((tab) => openCapturePanel(tab.id))

  browser.runtime.onMessage.addListener((message: ExtensionRequest) =>
    handleExtensionRequest(message)
  )
})

async function openCapturePanel(tabId?: number) {
  if (!tabId) return

  try {
    const message: OpenCapturePanelMessage = { type: "akasha:open-capture" }
    await browser.tabs.sendMessage(tabId, message)
  } catch {
    await showCaptureNotification(
      "Open a webpage",
      "Akasha Capture is available on regular webpages."
    )
  }
}

async function handleExtensionRequest(
  message: ExtensionRequest
): Promise<ExtensionResponse<unknown>> {
  try {
    if (message.type === "akasha:connect") {
      return { ok: true, value: await connectAkasha() }
    }

    if (message.type === "akasha:list-folders") {
      return { ok: true, value: await listFolderOptions() }
    }

    if (message.type === "akasha:save") {
      await saveCapture(message.draft, message.folderId)
      return { ok: true, value: undefined }
    }

    return { ok: false, error: "Akasha could not complete that action." }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Akasha could not complete that action.",
    }
  }
}

async function showCaptureNotification(title: string, message: string) {
  await browser.notifications.create({
    iconUrl: browser.runtime.getURL("/icon/128.png"),
    message,
    title,
    type: "basic",
  })
}
