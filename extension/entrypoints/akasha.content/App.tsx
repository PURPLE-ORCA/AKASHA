import type { CaptureDraft } from "@akasha/contracts"
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  FolderIcon,
  ImageIcon,
  PlayIcon,
  XIcon,
} from "@phosphor-icons/react"
import { useCallback, useEffect, useState } from "react"
import type { FolderOption } from "@/utils/akasha-api"
import { connectLibrary, getFolderOptions, saveLibraryCapture } from "@/utils/messages"
import { captureDraftStorage, selectedFolderStorage } from "@/utils/storage"

type SaveStatus = "idle" | "saving" | "saved"

export default function App({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState<CaptureDraft | null>(null)
  const [folders, setFolders] = useState<FolderOption[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")

  const applyFolders = useCallback(
    (availableFolders: FolderOption[], storedFolderId: string | null) => {
      const storedFolderExists = availableFolders.some((folder) => folder.id === storedFolderId)
      const nextFolderId =
        storedFolderExists && storedFolderId ? storedFolderId : (availableFolders[0]?.id ?? "")

      setFolders(availableFolders)
      setSelectedFolderId(nextFolderId)
    },
    []
  )

  useEffect(() => {
    async function initialize() {
      const [storedDraft, storedFolderId] = await Promise.all([
        captureDraftStorage.getValue(),
        selectedFolderStorage.getValue(),
      ])
      setDraft(storedDraft)

      try {
        const availableFolders = await withTimeout(getFolderOptions(), 3_000)
        applyFolders(availableFolders, storedFolderId)
        setIsConnected(true)
      } catch {
        setIsConnected(false)
      } finally {
        setIsLoading(false)
      }
    }

    void initialize()
    return captureDraftStorage.watch((nextDraft) => {
      setDraft(nextDraft)
      setSaveStatus("idle")
      setErrorMessage(null)
    })
  }, [applyFolders])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  async function handleConnect() {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const availableFolders = await connectLibrary()
      applyFolders(availableFolders, await selectedFolderStorage.getValue())
      setIsConnected(true)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Akasha could not connect.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    if (!draft || !selectedFolderId) return

    setSaveStatus("saving")
    setErrorMessage(null)

    try {
      await saveLibraryCapture(draft, selectedFolderId)
      await captureDraftStorage.removeValue()
      setDraft(null)
      setSaveStatus("saved")
    } catch (error) {
      setSaveStatus("idle")
      setErrorMessage(error instanceof Error ? error.message : "Akasha could not save this item.")
    }
  }

  async function handleFolderChange(folderId: string) {
    setSelectedFolderId(folderId)
    await selectedFolderStorage.setValue(folderId)
  }

  return (
    <div className="akasha-backdrop">
      <button
        aria-label="Close Akasha Capture"
        className="backdrop-dismiss"
        onClick={onClose}
        type="button"
      />
      <main aria-label="Akasha Capture" aria-modal="true" className="akasha-panel" role="dialog">
        <header className="akasha-header">
          <div className="akasha-brand">
            <span aria-hidden="true" className="akasha-mark" />
            <strong>Akasha</strong>
          </div>
          <button aria-label="Close" className="icon-button" onClick={onClose} type="button">
            <XIcon aria-hidden="true" />
          </button>
        </header>

        <div className="akasha-body">
          {isLoading ? (
            <div className="status-line" role="status">
              <ArrowClockwiseIcon aria-hidden="true" className="spin" />
              Loading library
            </div>
          ) : !isConnected ? (
            <section className="connection-state">
              <div>
                <h1>Connect Akasha</h1>
                <p>Save images and videos to your library.</p>
              </div>
              <button className="primary-button" onClick={handleConnect} type="button">
                Connect Akasha
              </button>
            </section>
          ) : saveStatus === "saved" ? (
            <section aria-live="polite" className="saved-state">
              <CheckCircleIcon aria-hidden="true" weight="fill" />
              <h1>Saved to Akasha</h1>
            </section>
          ) : draft ? (
            <>
              <CapturePreview draft={draft} />
              <label className="folder-field" htmlFor="akasha-folder">
                <span>Folder</span>
                <div className="select-wrap">
                  <FolderIcon aria-hidden="true" />
                  <select
                    id="akasha-folder"
                    onChange={(event) => void handleFolderChange(event.target.value)}
                    value={selectedFolderId}
                  >
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.label}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <button
                className="primary-button"
                disabled={!selectedFolderId || saveStatus === "saving"}
                onClick={handleSave}
                type="button"
              >
                {saveStatus === "saving" ? (
                  <ArrowClockwiseIcon aria-hidden="true" className="spin" />
                ) : null}
                {saveStatus === "saving" ? "Saving" : "Save"}
              </button>
            </>
          ) : (
            <section className="empty-state">
              <ImageIcon aria-hidden="true" />
              <p>Right-click an image or video to save it.</p>
            </section>
          )}

          {errorMessage ? (
            <p className="error-message" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  )
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error("Akasha could not reach your library.")),
      timeoutMs
    )

    promise.then(
      (value) => {
        window.clearTimeout(timeout)
        resolve(value)
      },
      (error: unknown) => {
        window.clearTimeout(timeout)
        reject(error)
      }
    )
  })
}

function CapturePreview({ draft }: { draft: CaptureDraft }) {
  const sourceLabel = new URL(draft.pageUrl).hostname.replace(/^www\./, "")

  return (
    <section aria-label="Current capture" className="capture-preview">
      <div className="preview-media">
        {draft.thumbnailUrl ? (
          <img alt="" src={draft.thumbnailUrl} />
        ) : (
          <PlayIcon aria-hidden="true" weight="fill" />
        )}
      </div>
      <div className="preview-copy">
        <h1>{draft.title}</h1>
        <p>{sourceLabel}</p>
      </div>
    </section>
  )
}
