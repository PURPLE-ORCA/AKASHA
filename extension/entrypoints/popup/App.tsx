import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  FolderIcon,
  ImageIcon,
  PlayIcon,
  SignInIcon,
} from "@phosphor-icons/react"
import type { CaptureDraft } from "@stillroom/contracts"
import { useCallback, useEffect, useState } from "react"
import type { FolderOption } from "@/utils/google-drive"
import { connectDrive, listFolderOptions, saveCapture } from "@/utils/google-drive"
import { captureDraftStorage, selectedFolderStorage } from "@/utils/storage"
import "./App.css"

type SaveStatus = "idle" | "saving" | "saved"

function App() {
  const [draft, setDraft] = useState<CaptureDraft | null>(null)
  const [folders, setFolders] = useState<FolderOption[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isLoadingFolders, setIsLoadingFolders] = useState(true)
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
    async function initializePopup() {
      const [storedDraft, storedFolderId] = await Promise.all([
        captureDraftStorage.getValue(),
        selectedFolderStorage.getValue(),
      ])
      setDraft(storedDraft)

      try {
        const availableFolders = await listFolderOptions(false)
        applyFolders(availableFolders, storedFolderId)
        setIsConnected(true)
      } catch {
        setIsConnected(false)
      } finally {
        setIsLoadingFolders(false)
      }
    }

    void initializePopup()

    return captureDraftStorage.watch((nextDraft) => {
      setDraft(nextDraft)
      setSaveStatus("idle")
      setErrorMessage(null)
    })
  }, [applyFolders])

  async function handleConnect() {
    setIsLoadingFolders(true)
    setErrorMessage(null)

    try {
      const availableFolders = await connectDrive()
      applyFolders(availableFolders, await selectedFolderStorage.getValue())
      setIsConnected(true)
    } catch {
      setErrorMessage("Stillroom could not connect. Check your account and try again.")
    } finally {
      setIsLoadingFolders(false)
    }
  }

  async function handleSave() {
    if (!draft || !selectedFolderId) {
      return
    }

    setSaveStatus("saving")
    setErrorMessage(null)

    try {
      await saveCapture(draft, selectedFolderId)
      await captureDraftStorage.removeValue()
      setSaveStatus("saved")
      setDraft(null)
    } catch (error) {
      setSaveStatus("idle")
      setErrorMessage(
        error instanceof Error ? error.message : "Stillroom could not save this item. Try again."
      )
    }
  }

  async function handleFolderChange(folderId: string) {
    setSelectedFolderId(folderId)
    await selectedFolderStorage.setValue(folderId)
  }

  return (
    <main className="capture-panel">
      <header className="capture-header">
        <div className="brand-mark" aria-hidden="true">
          <span />
        </div>
        <div>
          <p className="eyebrow">Stillroom</p>
          <h1>Capture</h1>
        </div>
      </header>

      {!isConnected ? (
        <section className="connection-card" aria-labelledby="connect-title">
          <div className="icon-disc">
            <FolderIcon aria-hidden="true" weight="duotone" />
          </div>
          <div>
            <h2 id="connect-title">Connect your library</h2>
            <p>Authorize Stillroom once to save and organize what inspires you.</p>
          </div>
          <button
            className="primary-button"
            disabled={isLoadingFolders}
            onClick={handleConnect}
            type="button"
          >
            {isLoadingFolders ? (
              <ArrowClockwiseIcon className="spin" aria-hidden="true" />
            ) : (
              <SignInIcon aria-hidden="true" />
            )}
            {isLoadingFolders ? "Connecting…" : "Connect library"}
          </button>
        </section>
      ) : saveStatus === "saved" ? (
        <section className="success-card" aria-live="polite">
          <CheckCircleIcon aria-hidden="true" weight="fill" />
          <div>
            <h2>Saved to Stillroom</h2>
            <p>Your capture is ready in the selected folder.</p>
          </div>
        </section>
      ) : draft ? (
        <>
          <CapturePreview draft={draft} />
          <div className="field-group">
            <label htmlFor="folder">Save to</label>
            <div className="select-wrap">
              <FolderIcon aria-hidden="true" />
              <select
                id="folder"
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
          </div>
          <button
            className="primary-button"
            disabled={!selectedFolderId || saveStatus === "saving"}
            onClick={handleSave}
            type="button"
          >
            {saveStatus === "saving" ? (
              <ArrowClockwiseIcon className="spin" aria-hidden="true" />
            ) : draft.kind === "video" ? (
              <PlayIcon aria-hidden="true" weight="fill" />
            ) : (
              <ImageIcon aria-hidden="true" />
            )}
            {saveStatus === "saving" ? "Saving…" : "Save capture"}
          </button>
        </>
      ) : (
        <section className="empty-card">
          <div className="icon-disc">
            <ImageIcon aria-hidden="true" weight="duotone" />
          </div>
          <div>
            <h2>Ready when inspiration strikes</h2>
            <p>Right-click any image or video and choose “Save to Stillroom.”</p>
          </div>
        </section>
      )}

      {errorMessage ? (
        <p className="error-message" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </main>
  )
}

function CapturePreview({ draft }: { draft: CaptureDraft }) {
  const sourceLabel = new URL(draft.pageUrl).hostname.replace(/^www\./, "")

  return (
    <section className="capture-preview" aria-label="Current capture">
      <div className="preview-media">
        {draft.thumbnailUrl ? (
          <img src={draft.thumbnailUrl} alt="" />
        ) : (
          <PlayIcon aria-hidden="true" weight="fill" />
        )}
        {draft.kind === "video" ? (
          <span className="video-badge">
            <PlayIcon aria-hidden="true" weight="fill" /> Video
          </span>
        ) : null}
      </div>
      <div className="preview-copy">
        <h2>{draft.title}</h2>
        <p>{sourceLabel}</p>
      </div>
    </section>
  )
}

export default App
