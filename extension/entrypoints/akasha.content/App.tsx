import type { CaptureDraft } from "@akasha/contracts"
import {
  ArrowClockwiseIcon,
  CaretDownIcon,
  CheckIcon,
  FolderIcon,
  ImageIcon,
  XIcon,
} from "@phosphor-icons/react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { FolderOption } from "@/utils/akasha-api"
import { connectLibrary, getFolderOptions, saveLibraryCapture } from "@/utils/messages"
import { captureDraftStorage, selectedFolderStorage } from "@/utils/storage"

type SaveStatus = "idle" | "saving"

export default function App({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState<CaptureDraft | null>(null)
  const [folders, setFolders] = useState<FolderOption[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const folderPickerRef = useRef<HTMLDetailsElement>(null)

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
      setDraft(storedDraft?.kind === "image" ? storedDraft : null)

      try {
        const availableFolders = await getFolderOptions()
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
      setDraft(nextDraft?.kind === "image" ? nextDraft : null)
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
      onClose()
    } catch (error) {
      setSaveStatus("idle")
      setErrorMessage(error instanceof Error ? error.message : "Akasha could not save this item.")
    }
  }

  async function handleFolderChange(folderId: string) {
    setSelectedFolderId(folderId)
    folderPickerRef.current?.removeAttribute("open")
    await selectedFolderStorage.setValue(folderId)
  }

  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId)

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
                <p>Save images to your library.</p>
              </div>
              <button className="primary-button" onClick={handleConnect} type="button">
                Connect Akasha
              </button>
            </section>
          ) : draft ? (
            <>
              <CapturePreview draft={draft} />
              <div className="folder-field">
                <span>Folder</span>
                <details className="folder-picker" ref={folderPickerRef}>
                  <summary>
                    <FolderIcon aria-hidden="true" />
                    <span>{selectedFolder?.label ?? "Akasha"}</span>
                    <CaretDownIcon aria-hidden="true" />
                  </summary>
                  <div aria-label="Folder" className="folder-options" role="listbox">
                    {folders.map((folder) => (
                      <button
                        aria-selected={folder.id === selectedFolderId}
                        key={folder.id}
                        onClick={() => void handleFolderChange(folder.id)}
                        role="option"
                        style={{ paddingInlineStart: `${12 + folder.depth * 18}px` }}
                        type="button"
                      >
                        <span>{folder.label}</span>
                        {folder.id === selectedFolderId ? <CheckIcon aria-hidden="true" /> : null}
                      </button>
                    ))}
                  </div>
                </details>
              </div>
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
              <p>Right-click an image to save it.</p>
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

function CapturePreview({ draft }: { draft: CaptureDraft }) {
  const sourceLabel = new URL(draft.pageUrl).hostname.replace(/^www\./, "")

  return (
    <section aria-label="Current capture" className="capture-preview">
      <div className="preview-media">
        {draft.thumbnailUrl ? (
          <img alt="" src={draft.thumbnailUrl} />
        ) : (
          <ImageIcon aria-hidden="true" />
        )}
      </div>
      <div className="preview-copy">
        <h1>{draft.title}</h1>
        <p>{sourceLabel}</p>
      </div>
    </section>
  )
}
