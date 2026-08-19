import { AkashaApiError, connectAkasha, listFolderOptions, saveCapture } from "@/utils/akasha-api"
import { createCaptureDraft } from "@/utils/capture"
import type {
  ExtensionRequest,
  ExtensionResponse,
  GetMediaDescriptorMessage,
  MediaDescriptor,
  OpenCapturePanelMessage,
} from "@/utils/messages"
import {
  type CaptureOutboxJob,
  createCaptureOutboxJob,
  prepareDeliveryAttempt,
  scheduleDeliveryRetry,
} from "@/utils/outbox"
import {
  captureDraftStorage,
  captureOutboxStorage,
  folderOptionsCacheStorage,
  selectedFolderStorage,
} from "@/utils/storage"

const CAPTURE_MENU_ID = "stillroom-capture-media"
const OUTBOX_ALARM_NAME = "akasha-capture-outbox"
const FAILED_NOTIFICATION_PREFIX = "akasha-save-failed:"
const FOLDER_CACHE_FRESH_MS = 5 * 60 * 1_000
const MEDIA_OBSERVER_FILE = "content-scripts/media-observer.js" as ScriptPublicPath
const CAPTURE_PANEL_FILE = "content-scripts/akasha.js" as ScriptPublicPath

let storageMutation = Promise.resolve()
let outboxExecution: Promise<void> | null = null
let folderRefresh: Promise<Awaited<ReturnType<typeof listFolderOptions>>> | null = null

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

    // Sites such as X put an image or transparent control layer over the video.
    // Chrome then reports the context-menu target as an image even though the
    // user is saving the underlying video, so always ask the page observer.
    const descriptor = await getMediaDescriptor(tab?.id, info.frameId)
    const draft = createCaptureDraft(descriptor ? { ...info, ...descriptor } : info, tab?.title)

    if (!draft) {
      await showCaptureNotification(
        "Could not capture this item",
        "Open the original image or video and try again."
      )
      return
    }

    await withStorageMutation(() => captureDraftStorage.setValue(draft))

    await openCapturePanel(tab?.id)
  })

  browser.action.onClicked.addListener((tab) => {
    void captureVisibleVideo(tab).catch(() =>
      showCaptureNotification("Could not capture this video", "Open the video post and try again.")
    )
  })
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === OUTBOX_ALARM_NAME) void processOutbox()
  })
  browser.runtime.onStartup.addListener(() => {
    void processOutbox()
    void installMediaObserversInOpenTabs()
  })
  browser.notifications.onClicked.addListener((notificationId) => {
    if (notificationId.startsWith(FAILED_NOTIFICATION_PREFIX)) {
      void restoreFailedCapture(notificationId.slice(FAILED_NOTIFICATION_PREFIX.length))
    }
  })

  browser.runtime.onMessage.addListener((message: ExtensionRequest, sender) =>
    handleExtensionRequest(message, sender)
  )

  void processOutbox()
  void installMediaObserversInOpenTabs()
})

async function getMediaDescriptor(tabId?: number, frameId?: number) {
  if (!tabId) return null

  const message: GetMediaDescriptorMessage = {
    type: "akasha:get-media-descriptor",
  }
  const options = frameId === undefined ? undefined : { frameId }

  try {
    return (await browser.tabs.sendMessage(tabId, message, options)) as MediaDescriptor | null
  } catch {
    try {
      await browser.scripting.executeScript({
        files: [MEDIA_OBSERVER_FILE],
        target: frameId === undefined ? { tabId } : { frameIds: [frameId], tabId },
      })
      return (await browser.tabs.sendMessage(tabId, message, options)) as MediaDescriptor | null
    } catch {
      return null
    }
  }
}

async function openCapturePanel(tabId?: number) {
  if (!tabId) return

  try {
    const message: OpenCapturePanelMessage = { type: "akasha:open-capture" }
    await sendOpenCaptureMessage(tabId, message)
  } catch {
    try {
      // Manifest content scripts are not added retroactively to tabs that were
      // already open when an unpacked extension was installed or reloaded.
      await browser.scripting.executeScript({
        files: [CAPTURE_PANEL_FILE],
        target: { tabId },
      })
      const message: OpenCapturePanelMessage = { type: "akasha:open-capture" }
      await sendOpenCaptureMessage(tabId, message, 5)
    } catch {
      await showCaptureNotification(
        "Open a webpage",
        "Akasha Capture is available on regular webpages."
      )
    }
  }
}

async function captureVisibleVideo(tab: Browser.tabs.Tab) {
  const descriptor = await getLargestVisibleVideoDescriptor(tab.id)

  if (descriptor && tab.url) {
    await storeVideoDraftAndOpen(descriptor, tab)
    return
  }

  await showCaptureNotification("No video found", "Play the video, then try again.")
}

async function getLargestVisibleVideoDescriptor(tabId?: number) {
  if (!tabId) return null

  try {
    const injectedFrames = await browser.scripting.executeScript({
      files: [MEDIA_OBSERVER_FILE],
      target: { allFrames: true, tabId },
    })
    const frameIds = [...new Set(injectedFrames.map(({ frameId }) => frameId))]
    const descriptors = await Promise.all(
      frameIds.map((frameId) => getMediaDescriptor(tabId, frameId))
    )

    return (
      descriptors
        .filter((descriptor): descriptor is MediaDescriptor => descriptor !== null)
        .sort(
          (left, right) =>
            (right.visibleArea ?? (right.width ?? 0) * (right.height ?? 0)) -
            (left.visibleArea ?? (left.width ?? 0) * (left.height ?? 0))
        )[0] ?? null
    )
  } catch {
    return getMediaDescriptor(tabId, 0)
  }
}

async function installMediaObserversInOpenTabs() {
  const tabs = await browser.tabs.query({})
  await Promise.allSettled(
    tabs.flatMap(({ id: tabId }) =>
      tabId
        ? [
            browser.scripting.executeScript({
              files: [MEDIA_OBSERVER_FILE],
              target: { allFrames: true, tabId },
            }),
          ]
        : []
    )
  )
}

async function storeVideoDraftAndOpen(
  descriptor: MediaDescriptor,
  tab: Pick<Browser.tabs.Tab, "id" | "title" | "url">
) {
  if (!tab.url) throw new Error("Akasha could not identify this page.")

  const draft = createCaptureDraft(
    {
      pageUrl: descriptor.pageUrl ?? tab.url,
      ...descriptor,
    },
    tab.title
  )

  if (!draft) throw new Error("Akasha could not capture this video.")

  await withStorageMutation(() => captureDraftStorage.setValue(draft))
  await openCapturePanel(tab.id)
}

async function sendOpenCaptureMessage(
  tabId: number,
  message: OpenCapturePanelMessage,
  attempts = 1
) {
  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = (await browser.tabs.sendMessage(tabId, message)) as
        | { ok?: boolean }
        | undefined
      if (response?.ok !== true) throw new Error("Akasha Capture is not ready on this page.")
      return response
    } catch (error) {
      lastError = error
      if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }

  throw lastError
}

async function handleExtensionRequest(
  message: ExtensionRequest,
  sender?: Browser.runtime.MessageSender
): Promise<ExtensionResponse<unknown>> {
  try {
    if (message.type === "akasha:connect") {
      const folders = await connectAkasha()
      await cacheFolderOptions(folders)
      return { ok: true, value: folders }
    }

    if (message.type === "akasha:list-folders") {
      return { ok: true, value: await getFolderOptions() }
    }

    if (message.type === "akasha:capture-video") {
      await storeVideoDraftAndOpen(message.descriptor, sender?.tab ?? {})
      return { ok: true, value: null }
    }

    if (message.type === "akasha:save") {
      const captureId = await enqueueCapture(message.draft, message.folderId)
      return { ok: true, value: { captureId } }
    }

    return { ok: false, error: "Akasha could not complete that action." }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Akasha could not complete that action.",
    }
  }
}

async function enqueueCapture(
  draft: Parameters<typeof createCaptureOutboxJob>[0],
  folderId: string
) {
  const job = createCaptureOutboxJob(draft, folderId)

  await withStorageMutation(async () => {
    const jobs = await captureOutboxStorage.getValue()
    await captureOutboxStorage.setValue([...jobs, job])
    await captureDraftStorage.removeValue()
  })

  await scheduleNextOutboxAlarm()
  queueMicrotask(() => void processOutbox())
  return job.captureId
}

function processOutbox() {
  if (outboxExecution) return outboxExecution

  outboxExecution = drainOutbox().finally(() => {
    outboxExecution = null
  })
  return outboxExecution
}

async function drainOutbox() {
  let job = await takeNextReadyJob()

  while (job) {
    await scheduleNextOutboxAlarm()

    try {
      await saveCapture(job.draft, job.folderId, job.captureId, job.attempt)
      await removeOutboxJob(job.captureId)
      await showCaptureNotification(
        "Saved to Akasha",
        `${job.draft.title} is now in your library.`
      ).catch(() => undefined)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Akasha could not save this item."
      const retryable = !(error instanceof AkashaApiError) || error.retryable

      if (error instanceof AkashaApiError && (error.status === 401 || error.status === 422)) {
        await folderOptionsCacheStorage.removeValue()
      }
      const updatedJob = retryable
        ? scheduleDeliveryRetry(job, message)
        : { ...job, errorMessage: message, status: "failed" as const }

      await replaceOutboxJob(updatedJob)

      if (updatedJob.status === "failed") {
        await showFailedCaptureNotification(updatedJob).catch(() => undefined)
      }
    }

    job = await takeNextReadyJob()
  }

  await scheduleNextOutboxAlarm()
}

async function takeNextReadyJob() {
  return withStorageMutation(async () => {
    const jobs = await captureOutboxStorage.getValue()
    const jobIndex = jobs.findIndex(
      (job) => job.status === "pending" && job.nextAttemptAt <= Date.now()
    )

    if (jobIndex < 0) return null

    const job = jobs[jobIndex]
    if (!job) return null

    const preparedJob = prepareDeliveryAttempt(job)
    const nextJobs = [...jobs]
    nextJobs[jobIndex] = preparedJob
    await captureOutboxStorage.setValue(nextJobs)
    return preparedJob
  })
}

async function replaceOutboxJob(updatedJob: CaptureOutboxJob) {
  await withStorageMutation(async () => {
    const jobs = await captureOutboxStorage.getValue()
    await captureOutboxStorage.setValue(
      jobs.map((job) => (job.captureId === updatedJob.captureId ? updatedJob : job))
    )
  })
}

async function removeOutboxJob(captureId: string) {
  await withStorageMutation(async () => {
    const jobs = await captureOutboxStorage.getValue()
    await captureOutboxStorage.setValue(jobs.filter((job) => job.captureId !== captureId))
  })
}

async function scheduleNextOutboxAlarm() {
  const jobs = await captureOutboxStorage.getValue()
  const nextAttemptAt = jobs
    .filter((job) => job.status === "pending")
    .reduce<number | null>(
      (earliest, job) =>
        earliest === null ? job.nextAttemptAt : Math.min(earliest, job.nextAttemptAt),
      null
    )

  if (nextAttemptAt === null) {
    await browser.alarms.clear(OUTBOX_ALARM_NAME)
    return
  }

  await browser.alarms.create(OUTBOX_ALARM_NAME, {
    when: Math.max(Date.now() + 1_000, nextAttemptAt),
  })
}

async function restoreFailedCapture(captureId: string) {
  const restoredJob = await withStorageMutation(async () => {
    const jobs = await captureOutboxStorage.getValue()
    const job = jobs.find(
      (candidate) => candidate.captureId === captureId && candidate.status === "failed"
    )

    if (!job) return null

    await captureDraftStorage.setValue(job.draft)
    await selectedFolderStorage.setValue(job.folderId)
    await captureOutboxStorage.setValue(
      jobs.filter((candidate) => candidate.captureId !== captureId)
    )
    return job
  })

  if (!restoredJob) return

  await browser.notifications.clear(`${FAILED_NOTIFICATION_PREFIX}${captureId}`)
  const [activeTab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  })
  await openCapturePanel(activeTab?.id)
}

async function getFolderOptions() {
  const cached = await folderOptionsCacheStorage.getValue()

  if (cached) {
    if (Date.now() - cached.cachedAt >= FOLDER_CACHE_FRESH_MS) {
      void refreshFolderOptions().catch(() => undefined)
    }

    return cached.folders
  }

  return refreshFolderOptions()
}

function refreshFolderOptions() {
  if (folderRefresh) return folderRefresh

  folderRefresh = listFolderOptions()
    .then(async (folders) => {
      await cacheFolderOptions(folders)
      return folders
    })
    .finally(() => {
      folderRefresh = null
    })
  return folderRefresh
}

async function cacheFolderOptions(folders: Awaited<ReturnType<typeof listFolderOptions>>) {
  await folderOptionsCacheStorage.setValue({ cachedAt: Date.now(), folders })
}

function withStorageMutation<T>(operation: () => Promise<T>) {
  const result = storageMutation.then(operation, operation)
  storageMutation = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

async function showFailedCaptureNotification(job: CaptureOutboxJob) {
  await browser.notifications.create(`${FAILED_NOTIFICATION_PREFIX}${job.captureId}`, {
    iconUrl: browser.runtime.getURL("/icon/128.png"),
    message: `${job.errorMessage ?? "Akasha could not save this item."} Click to try again.`,
    title: "Save needs attention",
    type: "basic",
  })
}

async function showCaptureNotification(title: string, message: string) {
  await browser.notifications.create({
    iconUrl: browser.runtime.getURL("/icon/128.png"),
    message,
    title,
    type: "basic",
  })
}
