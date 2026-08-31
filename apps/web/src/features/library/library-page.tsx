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
  MoveFolderDialog,
  RemoveFolderDialog,
  RenameFolderDialog,
} from "./folder-action-dialogs"
import {
  MoveItemsDialog,
  NewFolderDialog,
  RemoveItemsDialog,
} from "./library-action-dialogs"
import { LibraryBulkActions } from "./library-bulk-actions"
import { LibraryCommandPalette } from "./library-command-palette"
import { LibraryEmptyState } from "./library-empty-state"
import {
  getFolderMoveDestinations,
  getFolderRemovalSummary,
} from "./library-folder-actions"
import { filterLibraryItems } from "./library-items"
import type { LibrarySortOrder } from "./library-items"
import { LibraryToolbar } from "./library-toolbar"
import { LibraryDropTarget, LibraryUploader } from "./library-upload"
import type { LibraryUploaderHandle } from "./library-upload"
import { MediaGallery } from "./media-gallery"
import { useLibraryKeyboardShortcuts } from "./use-library-keyboard-shortcuts"
import {
  createLibraryFolder,
  moveLibraryFolder,
  moveLibraryItems,
  removeLibraryFolder,
  removeLibraryItems,
  renameLibraryFolder,
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
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<LibrarySortOrder>("newest")
  const [commandOpen, setCommandOpen] = useState(false)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [folderToMove, setFolderToMove] = useState<LibraryFolder | null>(null)
  const [folderToRemove, setFolderToRemove] =
    useState<LibraryFolder | null>(null)
  const [folderToRename, setFolderToRename] =
    useState<LibraryFolder | null>(null)
  const [moveItemIds, setMoveItemIds] = useState<string[]>([])
  const [removeItemIds, setRemoveItemIds] = useState<string[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [theme, setTheme] = useState<ThemePreference>("system")
  const uploaderRef = useRef<LibraryUploaderHandle>(null)
  const { folders, items, rootFolderId } = initialSnapshot
  const selectedFolderId = getSelectedFolderId(
    folders,
    rootFolderId,
    requestedFolderId
  )
  const { folderPath, parentFolderId, selectedFolderName } = useMemo(
    () => getSelectedFolderDetails(folders, selectedFolderId),
    [folders, selectedFolderId]
  )
  const filteredItems = useMemo(
    () =>
      filterLibraryItems(items, folders, {
        mediaFilter,
        query: searchQuery,
        rootFolderId,
        selectedFolderId,
        sortOrder,
      }),
    [
      folders,
      items,
      mediaFilter,
      rootFolderId,
      searchQuery,
      selectedFolderId,
      sortOrder,
    ]
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
    const movingItems = items.filter((item) => moveItemIds.includes(item.id))
    const destinations: LibraryFolder[] = [
      { id: rootFolderId, name: "Akasha", parentId: null },
      ...folders,
    ]

    return destinations.filter(
      (folder) =>
        movingItems.length === 0 ||
        !movingItems.every((item) => item.folderId === folder.id)
    )
  }, [folders, items, moveItemIds, rootFolderId])
  const folderMoveDestinations = useMemo(
    () =>
      getFolderMoveDestinations(folders, rootFolderId, folderToMove),
    [folderToMove, folders, rootFolderId]
  )
  const folderRemovalSummary = useMemo(
    () => getFolderRemovalSummary(folders, items, folderToRemove),
    [folderToRemove, folders, items]
  )

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
    setSelectedItemIds(new Set())
    setIsSelectionMode(false)
  }, [activeTab, mediaFilter, selectedFolderId])

  useLibraryKeyboardShortcuts({
    activeView: activeTab,
    canGoToParent:
      selectedFolderId !== rootFolderId && Boolean(onFolderNavigate),
    hasItems: filteredItems.length > 0,
    isSelectionMode,
    onCommandPaletteToggle: () => setCommandOpen((open) => !open),
    onExitSelection: exitSelectionMode,
    onGoToParent: () => onFolderNavigate?.(parentFolderId ?? undefined),
    onMediaFilterCycle: () =>
      setMediaFilter((current) => cycleMediaFilter(current)),
    onSelectionModeToggle: () => changeSelectionMode(!isSelectionMode),
    onThemeToggle: () =>
      setTheme((current) =>
        resolveTheme(current) === "dark" ? "light" : "dark"
      ),
    onUpload: () => uploaderRef.current?.openFilePicker(),
    onViewToggle: () =>
      setActiveTab((current) => (current === "all" ? "folders" : "all")),
  })

  async function createFolder(name: string) {
    await createLibraryFolder({
      data: { name, parentFolderId: selectedFolderId },
    })
    await onRefresh()
  }

  async function renameFolder(name: string) {
    if (!folderToRename) return
    await renameLibraryFolder({
      data: { folderId: folderToRename.id, name },
    })
    await onRefresh()
  }

  async function moveFolder(destinationFolderId: string) {
    if (!folderToMove) return
    await moveLibraryFolder({
      data: { destinationFolderId, folderId: folderToMove.id },
    })
    await onRefresh()
  }

  async function removeFolder() {
    if (!folderToRemove) return
    await removeLibraryFolder({ data: { folderId: folderToRemove.id } })
    await onRefresh()
  }

  function changeSearchQuery(query: string) {
    setSearchQuery(query)
    if (!query.trim()) return

    setActiveTab("all")
    if (selectedFolderId !== rootFolderId) onFolderNavigate?.()
  }

  function changeSelectionMode(nextSelectionMode: boolean) {
    setIsSelectionMode(nextSelectionMode)
    if (!nextSelectionMode) setSelectedItemIds(new Set())
  }

  function exitSelectionMode() {
    setIsSelectionMode(false)
    setSelectedItemIds(new Set())
  }

  function changeItemSelection(itemId: string, isSelected: boolean) {
    setSelectedItemIds((current) => {
      const next = new Set(current)
      if (isSelected) next.add(itemId)
      else next.delete(itemId)
      return next
    })
  }

  async function moveItems(destinationFolderId: string) {
    if (moveItemIds.length === 0) return
    await moveLibraryItems({
      data: { destinationFolderId, fileIds: moveItemIds },
    })
    await onRefresh()
    exitSelectionMode()
  }

  async function removeItems() {
    if (removeItemIds.length === 0) return
    await removeLibraryItems({ data: { fileIds: removeItemIds } })
    await onRefresh()
    exitSelectionMode()
  }

  function renderLibraryContent() {
    if (activeTab === "folders") {
      return (
        <FolderGallery
          folders={visibleFolders}
          items={items}
          libraryFolders={folders}
          onMoveFolder={setFolderToMove}
          onRemoveFolder={setFolderToRemove}
          onRenameFolder={setFolderToRename}
        />
      )
    }

    if (isLibraryEmpty) {
      return (
        <LibraryEmptyState
          onCreateFolder={createFolder}
          onUpload={() => uploaderRef.current?.openFilePicker()}
        />
      )
    }

    return (
      <MediaGallery
        emptyMessage={searchQuery.trim() ? "No matching media." : undefined}
        isSelectionMode={isSelectionMode}
        items={filteredItems}
        onMoveItem={(itemId) => setMoveItemIds([itemId])}
        onOpenFolder={(folderId) => {
          if (folderId !== selectedFolderId && onFolderNavigate) {
            onFolderNavigate(folderId)
          }
        }}
        onRemoveItem={(itemId) => setRemoveItemIds([itemId])}
        onSelectionChange={changeItemSelection}
        selectedItemIds={selectedItemIds}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LibraryToolbar
        activeView={activeTab}
        canSelect={filteredItems.length > 0}
        folderPath={folderPath}
        isSelectionMode={isSelectionMode}
        mediaFilter={mediaFilter}
        onMediaFilterChange={setMediaFilter}
        onSearchQueryChange={changeSearchQuery}
        onSelectionModeChange={changeSelectionMode}
        onSortOrderChange={setSortOrder}
        onThemeChange={setTheme}
        onUpload={() => uploaderRef.current?.openFilePicker()}
        onViewChange={setActiveTab}
        searchQuery={searchQuery}
        sortOrder={sortOrder}
        theme={theme}
        user={initialSnapshot.user}
      />
      <LibraryDropTarget
        folderName={selectedFolderName}
        onFiles={(files) => uploaderRef.current?.addFiles(files)}
      >
        <ContextMenu>
          <ContextMenu.Trigger
            render={(props) => (
              <div
                {...props}
                className="block min-h-[calc(100svh-4.5rem)] w-full"
                data-library-context-trigger
              />
            )}
          >
            <main
              className="w-full px-[clamp(0.75rem,1.5vw,1.5rem)] pt-4 pb-12"
              id="main-content"
            >
              <div className="sr-only">
                <Typography type="h1">{selectedFolderName}</Typography>
              </div>
              <div className="min-h-[calc(100svh-10rem)]">
                {renderLibraryContent()}
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
      <LibraryBulkActions
        onDelete={() => setRemoveItemIds(Array.from(selectedItemIds))}
        onExit={exitSelectionMode}
        onMove={() => setMoveItemIds(Array.from(selectedItemIds))}
        selectedCount={selectedItemIds.size}
      />
      <NewFolderDialog
        onCreate={createFolder}
        onOpenChange={setCreateFolderOpen}
        open={createFolderOpen}
        parentName={selectedFolderName}
      />
      <MoveItemsDialog
        folders={moveDestinations}
        itemCount={moveItemIds.length}
        onMove={moveItems}
        onOpenChange={(open) => {
          if (!open) setMoveItemIds([])
        }}
        open={moveItemIds.length > 0}
      />
      <RemoveItemsDialog
        itemCount={removeItemIds.length}
        onOpenChange={(open) => {
          if (!open) setRemoveItemIds([])
        }}
        onRemove={removeItems}
        open={removeItemIds.length > 0}
      />
      <RenameFolderDialog
        folder={folderToRename}
        onOpenChange={(open) => {
          if (!open) setFolderToRename(null)
        }}
        onRename={renameFolder}
      />
      <MoveFolderDialog
        destinations={folderMoveDestinations}
        folder={folderToMove}
        onMove={moveFolder}
        onOpenChange={(open) => {
          if (!open) setFolderToMove(null)
        }}
      />
      <RemoveFolderDialog
        assetCount={folderRemovalSummary.assetCount}
        folder={folderToRemove}
        nestedFolderCount={folderRemovalSummary.nestedFolderCount}
        onOpenChange={(open) => {
          if (!open) setFolderToRemove(null)
        }}
        onRemove={removeFolder}
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

function getSelectedFolderDetails(
  folders: LibraryFolder[],
  selectedFolderId: string
) {
  const folderPath = getFolderPath(folders, selectedFolderId)

  return {
    folderPath,
    parentFolderId: folders.find((folder) => folder.id === selectedFolderId)
      ?.parentId,
    selectedFolderName: folderPath.at(-1)?.name ?? "Akasha",
  }
}
