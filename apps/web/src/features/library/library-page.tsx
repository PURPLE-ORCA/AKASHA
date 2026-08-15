import { useEffect, useMemo, useState } from "react"
import { buildFolderTree, getFolderPath } from "@stillroom/contracts"

import type { DriveLibrarySnapshot } from "@/server/drive/library.server"
import { MoveItemsDialog, RemoveItemsDialog } from "./library-action-dialogs"
import {
  createLibraryFolder,
  moveLibraryItems,
  removeLibraryItems,
} from "./library.functions"
import { LibraryEmptyState } from "./library-empty-state"
import { LibrarySidebar } from "./library-sidebar"
import { LibraryToolbar } from "./library-toolbar"
import { MediaGallery } from "./media-gallery"
import { SelectionBar } from "./selection-bar"

type LibraryPageProps = {
  initialSnapshot: DriveLibrarySnapshot
  onRefresh?: () => Promise<void>
  requestedFolderId?: string
}

export function LibraryPage({
  initialSnapshot,
  onRefresh = async () => {},
  requestedFolderId,
}: LibraryPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isHydrated, setIsHydrated] = useState(false)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [moveItemIds, setMoveItemIds] = useState<string[]>([])
  const [removeItemIds, setRemoveItemIds] = useState<string[]>([])
  const { folders, items } = initialSnapshot
  const selectedFolderId = getSelectedFolderId(
    folders,
    initialSnapshot,
    requestedFolderId
  )
  const folderTree = useMemo(() => buildFolderTree(folders), [folders])
  const folderPath = useMemo(
    () => getFolderPath(folders, selectedFolderId),
    [folders, selectedFolderId]
  )
  const visibleItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase()

    return items.filter((item) => {
      const isInFolder = item.folderId === selectedFolderId
      const matchesQuery =
        normalizedQuery.length === 0 ||
        item.title.toLocaleLowerCase().includes(normalizedQuery) ||
        item.sourceLabel.toLocaleLowerCase().includes(normalizedQuery)

      return isInFolder && matchesQuery
    })
  }, [items, searchQuery, selectedFolderId])
  const selectedFolderName = folderPath.at(-1)?.name ?? "Stillroom"
  const isLibraryEmpty = folders.length === 0 && items.length === 0

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    setSelectedItemIds(new Set())
  }, [selectedFolderId])

  function updateItemSelection(itemId: string, selected: boolean) {
    setSelectedItemIds((currentSelection) => {
      const nextSelection = new Set(currentSelection)

      if (selected) {
        nextSelection.add(itemId)
      } else {
        nextSelection.delete(itemId)
      }

      return nextSelection
    })
  }

  async function createFolder(name: string) {
    await createLibraryFolder({
      data: {
        name,
        parentFolderId: selectedFolderId,
      },
    })
    await onRefresh()
  }

  async function moveItems(destinationFolderId: string) {
    await moveLibraryItems({
      data: { destinationFolderId, fileIds: moveItemIds },
    })
    setSelectedItemIds(new Set())
    await onRefresh()
  }

  async function removeItems() {
    await removeLibraryItems({ data: { fileIds: removeItemIds } })
    setSelectedItemIds(new Set())
    await onRefresh()
  }

  return (
    <div
      className="min-h-svh bg-background lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]"
      data-hydrated={isHydrated}
    >
      <aside className="hidden h-svh border-r border-sidebar-border lg:sticky lg:top-0 lg:block">
        <LibrarySidebar
          folders={folderTree}
          onCreateFolder={createFolder}
          selectedFolderId={selectedFolderId}
          selectedFolderName={selectedFolderName}
        />
      </aside>
      <div className="min-w-0">
        <LibraryToolbar
          folders={folderTree}
          folderPath={folderPath.map((folder) => folder.name)}
          onCreateFolder={createFolder}
          onSearchChange={setSearchQuery}
          searchQuery={searchQuery}
          selectedFolderId={selectedFolderId}
          selectedFolderName={selectedFolderName}
        />
        <main className="px-4 py-6 md:px-6 lg:px-8" id="main-content">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {selectedFolderName}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {visibleItems.length}{" "}
                {visibleItems.length === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
          {isLibraryEmpty ? (
            <LibraryEmptyState onCreateFolder={createFolder} />
          ) : (
            <MediaGallery
              items={visibleItems}
              onItemSelectionChange={updateItemSelection}
              onMoveItems={setMoveItemIds}
              onRemoveItems={setRemoveItemIds}
              selectedItemIds={selectedItemIds}
            />
          )}
        </main>
      </div>
      <SelectionBar
        onClear={() => setSelectedItemIds(new Set())}
        onMove={() => setMoveItemIds([...selectedItemIds])}
        onRemove={() => setRemoveItemIds([...selectedItemIds])}
        selectedCount={selectedItemIds.size}
      />
      <MoveItemsDialog
        folders={folders.filter((folder) => folder.id !== selectedFolderId)}
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
    </div>
  )
}

function getSelectedFolderId(
  folders: DriveLibrarySnapshot["folders"],
  snapshot: DriveLibrarySnapshot,
  requestedFolderId?: string
) {
  if (
    requestedFolderId &&
    folders.some((folder) => folder.id === requestedFolderId)
  ) {
    return requestedFolderId
  }

  return folders[0]?.id ?? snapshot.rootFolderId
}
