import { useMemo, useState } from "react"
import { buildFolderTree, getFolderPath } from "@stillroom/contracts"

import { libraryFolders, libraryItems } from "./library-fixtures"
import { LibrarySidebar } from "./library-sidebar"
import { LibraryToolbar } from "./library-toolbar"
import { MediaGallery } from "./media-gallery"
import { SelectionBar } from "./selection-bar"

const selectedFolderId = "bento"

export function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const folderTree = useMemo(() => buildFolderTree(libraryFolders), [])
  const folderPath = useMemo(
    () => getFolderPath(libraryFolders, selectedFolderId),
    []
  )
  const visibleItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase()

    return libraryItems.filter((item) => {
      const isInFolder = item.folderId === selectedFolderId
      const matchesQuery =
        normalizedQuery.length === 0 ||
        item.title.toLocaleLowerCase().includes(normalizedQuery) ||
        item.sourceLabel.toLocaleLowerCase().includes(normalizedQuery)

      return isInFolder && matchesQuery
    })
  }, [searchQuery])

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

  return (
    <div className="min-h-svh bg-background lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="hidden h-svh border-r border-sidebar-border lg:sticky lg:top-0 lg:block">
        <LibrarySidebar
          folders={folderTree}
          selectedFolderId={selectedFolderId}
        />
      </aside>
      <div className="min-w-0">
        <LibraryToolbar
          folders={folderTree}
          folderPath={folderPath.map((folder) => folder.name)}
          onSearchChange={setSearchQuery}
          searchQuery={searchQuery}
          selectedFolderId={selectedFolderId}
        />
        <main className="px-4 py-6 md:px-6 lg:px-8" id="library-content">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {folderPath.at(-1)?.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {visibleItems.length}{" "}
                {visibleItems.length === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
          <MediaGallery
            items={visibleItems}
            onItemSelectionChange={updateItemSelection}
            selectedItemIds={selectedItemIds}
          />
        </main>
      </div>
      <SelectionBar
        onClear={() => setSelectedItemIds(new Set())}
        selectedCount={selectedItemIds.size}
      />
    </div>
  )
}
