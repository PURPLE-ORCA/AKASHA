import { useEffect, useMemo, useRef, useState } from "react"
import { FolderSimplePlusIcon } from "@phosphor-icons/react"
import { Label, Typography } from "@heroui/react"
import { ContextMenu } from "@heroui-pro/react"
import { getFolderPath } from "@akasha/contracts"
import type { LibraryFolder } from "@akasha/contracts"

import type { DriveLibrarySnapshot } from "@/server/drive/library.server"
import {
  applyTheme,
  isThemePreference,
  resolveTheme,
} from "@/features/theme/theme"
import type { ThemePreference } from "@/features/theme/theme"
import { FolderGallery } from "./folder-tree"
import {
  MoveItemsDialog,
  NewFolderDialog,
  RemoveItemsDialog,
} from "./library-action-dialogs"
import { LibraryCommandPalette } from "./library-command-palette"
import { LibraryEmptyState } from "./library-empty-state"
import { LibraryToolbar } from "./library-toolbar"
import { LibraryDropTarget, LibraryUploader } from "./library-upload"
import type { LibraryUploaderHandle } from "./library-upload"
import { MediaGallery } from "./media-gallery"
import {
  createLibraryFolder,
  moveLibraryItems,
  removeLibraryItems,
} from "./library.functions"

type LibraryPageProps = {
  initialSnapshot: DriveLibrarySnapshot
  onFolderNavigate?: (folderId?: string) => void
  onRefresh?: () => Promise<void>
  requestedFolderId?: string
}

export function LibraryPage({
  initialSnapshot,
  onFolderNavigate,
  onRefresh = async () => {},
  requestedFolderId,
}: LibraryPageProps) {
  const [activeTab, setActiveTab] = useState<"all" | "folders">("all")
  const [mediaFilter, setMediaFilter] = useState<"all" | "image" | "video">(
    "all"
  )
  const [commandOpen, setCommandOpen] = useState(false)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [moveItemId, setMoveItemId] = useState<string | null>(null)
  const [removeItemId, setRemoveItemId] = useState<string | null>(null)
  const [theme, setTheme] = useState<ThemePreference>("system")
  const uploaderRef = useRef<LibraryUploaderHandle>(null)
  const { folders, items, rootFolderId } = initialSnapshot
  const selectedFolderId = getSelectedFolderId(
    folders,
    rootFolderId,
    requestedFolderId
  )
  const folderPath = useMemo(
    () => getFolderPath(folders, selectedFolderId),
    [folders, selectedFolderId]
  )
  const selectedFolderName = folderPath.at(-1)?.name ?? "Akasha"
  const parentFolderId = folders.find(
    (folder) => folder.id === selectedFolderId
  )?.parentId
  const visibleItems = useMemo(
    () =>
      selectedFolderId === rootFolderId
        ? items
        : items.filter((item) => item.folderId === selectedFolderId),
    [items, rootFolderId, selectedFolderId]
  )
  const filteredItems = useMemo(
    () =>
      mediaFilter === "all"
        ? visibleItems
        : visibleItems.filter((item) => item.kind === mediaFilter),
    [mediaFilter, visibleItems]
  )
  const visibleFolders = useMemo(
    () =>
      folders.filter((folder) =>
        selectedFolderId === rootFolderId
          ? folder.parentId === null
          : folder.parentId === selectedFolderId
      ),
    [folders, rootFolderId, selectedFolderId]
  )
  const isLibraryEmpty = folders.length === 0 && items.length === 0
  const moveDestinations = useMemo(() => {
    const movingItem = items.find((item) => item.id === moveItemId)
    const destinations: LibraryFolder[] = folders.filter(
      (folder) => folder.id !== movingItem?.folderId
    )

    if (movingItem?.folderId !== rootFolderId) {
      destinations.unshift({
        id: rootFolderId,
        name: "Akasha",
        parentId: null,
      })
    }

    return destinations
  }, [folders, items, moveItemId, rootFolderId])

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("stillroom-theme")

    if (isThemePreference(savedTheme)) setTheme(savedTheme)
  }, [])

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => applyTheme(theme, media.matches)
    apply()
    media.addEventListener("change", apply)
    window.localStorage.setItem("stillroom-theme", theme)
    return () => media.removeEventListener("change", apply)
  }, [theme])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target instanceof HTMLElement ? event.target : null
      const isTyping =
        target?.matches("input, textarea, select") ||
        target?.isContentEditable ||
        Boolean(target?.closest('[contenteditable="true"]'))

      if (event.defaultPrevented || event.repeat) return

      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault()
        setCommandOpen((open) => !open)
        return
      }

      if (isTyping || event.metaKey || event.ctrlKey || event.altKey) return

      switch (event.key.toLowerCase()) {
        case "arrowdown":
          if (
            !target?.closest('[role="dialog"]') &&
            selectedFolderId !== rootFolderId &&
            onFolderNavigate
          ) {
            event.preventDefault()
            onFolderNavigate(parentFolderId ?? undefined)
          }
          break
        case "d":
          event.preventDefault()
          setTheme((current) =>
            resolveTheme(current) === "dark" ? "light" : "dark"
          )
          break
        case "f":
          if (activeTab === "all") {
            event.preventDefault()
            setMediaFilter((current) => cycleMediaFilter(current))
          }
          break
        case "s":
          event.preventDefault()
          setActiveTab((current) => (current === "all" ? "folders" : "all"))
          break
        case "u":
          if (target?.closest('[role="dialog"]')) return
          event.preventDefault()
          uploaderRef.current?.openFilePicker()
          break
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    activeTab,
    onFolderNavigate,
    parentFolderId,
    rootFolderId,
    selectedFolderId,
  ])

  async function createFolder(name: string) {
    await createLibraryFolder({
      data: { name, parentFolderId: selectedFolderId },
    })
    await onRefresh()
  }

  async function moveItem(destinationFolderId: string) {
    if (!moveItemId) return
    await moveLibraryItems({
      data: { destinationFolderId, fileIds: [moveItemId] },
    })
    await onRefresh()
  }

  async function removeItem() {
    if (!removeItemId) return
    await removeLibraryItems({ data: { fileIds: [removeItemId] } })
    await onRefresh()
  }

  return (
    <div className="library-shell">
      <LibraryToolbar
        activeView={activeTab}
        folderPath={folderPath}
        mediaFilter={mediaFilter}
        onMediaFilterChange={setMediaFilter}
        onThemeChange={setTheme}
        onUpload={() => uploaderRef.current?.openFilePicker()}
        onViewChange={setActiveTab}
        theme={theme}
      />
      <LibraryDropTarget
        folderName={selectedFolderName}
        onFiles={(files) => uploaderRef.current?.addFiles(files)}
      >
        <ContextMenu>
          <ContextMenu.Trigger
            render={(props) => <div {...props} data-library-context-trigger />}
          >
            <main className="library-main" id="main-content">
              <div className="sr-only">
                <Typography type="h1">{selectedFolderName}</Typography>
              </div>
              <div className="library-content">
                {activeTab === "all" ? (
                  isLibraryEmpty ? (
                    <LibraryEmptyState
                      onCreateFolder={createFolder}
                      onUpload={() => uploaderRef.current?.openFilePicker()}
                    />
                  ) : (
                    <MediaGallery
                      items={filteredItems}
                      onMoveItem={setMoveItemId}
                      onOpenFolder={(folderId) => {
                        if (folderId !== selectedFolderId && onFolderNavigate) {
                          onFolderNavigate(folderId)
                        }
                      }}
                      onRemoveItem={setRemoveItemId}
                    />
                  )
                ) : (
                  <FolderGallery
                    folders={visibleFolders}
                    items={items}
                    libraryFolders={folders}
                  />
                )}
              </div>
            </main>
          </ContextMenu.Trigger>
          <ContextMenu.Popover>
            <ContextMenu.Menu
              aria-label="Folder actions"
              onAction={() => setCreateFolderOpen(true)}
            >
              <ContextMenu.Item id="create-folder" textValue="Create folder">
                <FolderSimplePlusIcon aria-hidden="true" />
                <Label>Create folder</Label>
              </ContextMenu.Item>
            </ContextMenu.Menu>
          </ContextMenu.Popover>
        </ContextMenu>
      </LibraryDropTarget>
      <LibraryCommandPalette
        folders={folders}
        onOpenChange={setCommandOpen}
        onThemeChange={setTheme}
        open={commandOpen}
      />
      <NewFolderDialog
        onCreate={createFolder}
        onOpenChange={setCreateFolderOpen}
        open={createFolderOpen}
        parentName={selectedFolderName}
      />
      <MoveItemsDialog
        folders={moveDestinations}
        itemCount={moveItemId ? 1 : 0}
        onMove={moveItem}
        onOpenChange={(open) => {
          if (!open) setMoveItemId(null)
        }}
        open={moveItemId !== null}
      />
      <RemoveItemsDialog
        itemCount={removeItemId ? 1 : 0}
        onOpenChange={(open) => {
          if (!open) setRemoveItemId(null)
        }}
        onRemove={removeItem}
        open={removeItemId !== null}
      />
      <LibraryUploader
        folderId={selectedFolderId}
        folderName={selectedFolderName}
        onRefresh={onRefresh}
        ref={uploaderRef}
      />
    </div>
  )
}

function cycleMediaFilter(current: "all" | "image" | "video") {
  if (current === "all") return "image"
  if (current === "image") return "video"
  return "all"
}

function getSelectedFolderId(
  folders: DriveLibrarySnapshot["folders"],
  rootFolderId: string,
  requestedFolderId?: string
) {
  return requestedFolderId &&
    folders.some((folder) => folder.id === requestedFolderId)
    ? requestedFolderId
    : rootFolderId
}
