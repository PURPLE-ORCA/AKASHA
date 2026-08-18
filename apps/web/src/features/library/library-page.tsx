import { useEffect, useMemo, useState } from "react"
import { FolderSimplePlusIcon } from "@phosphor-icons/react"
import { Label, Tabs, Typography } from "@heroui/react"
import { ContextMenu } from "@heroui-pro/react"
import { getFolderPath } from "@stillroom/contracts"
import type { LibraryFolder } from "@stillroom/contracts"

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
import { MediaGallery } from "./media-gallery"
import {
  createLibraryFolder,
  moveLibraryItems,
  removeLibraryItems,
} from "./library.functions"

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
  const [activeTab, setActiveTab] = useState<"all" | "folders">("all")
  const [commandOpen, setCommandOpen] = useState(false)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [moveItemId, setMoveItemId] = useState<string | null>(null)
  const [removeItemId, setRemoveItemId] = useState<string | null>(null)
  const [theme, setTheme] = useState<ThemePreference>("system")
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
  const selectedFolderName = folderPath.at(-1)?.name ?? "Stillroom"
  const visibleItems = useMemo(
    () =>
      selectedFolderId === rootFolderId
        ? items
        : items.filter((item) => item.folderId === selectedFolderId),
    [items, rootFolderId, selectedFolderId]
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
        name: "Stillroom",
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
      const target = event.target as HTMLElement | null
      const isTyping =
        target?.matches("input, textarea, select") || target?.isContentEditable

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen((open) => !open)
        return
      }

      if (
        !isTyping &&
        !event.metaKey &&
        !event.ctrlKey &&
        event.key.toLowerCase() === "d"
      ) {
        event.preventDefault()
        setTheme((current) =>
          resolveTheme(current) === "dark" ? "light" : "dark"
        )
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

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
        folderPath={folderPath}
        onThemeChange={setTheme}
        theme={theme}
      />
      <ContextMenu>
        <ContextMenu.Trigger
          render={(props) => <div {...props} data-library-context-trigger />}
        >
          <main className="library-main" id="main-content">
            <div className="sr-only">
              <Typography type="h1">{selectedFolderName}</Typography>
            </div>
            <div className="library-tabs">
              <Tabs
                selectedKey={activeTab}
                variant="secondary"
                onSelectionChange={(key) =>
                  setActiveTab(key as "all" | "folders")
                }
              >
                <Tabs.ListContainer
                  render={(props) => (
                    <div {...props} data-library-tabs-list-container />
                  )}
                >
                  <Tabs.List aria-label="Library views">
                    <Tabs.Tab id="all">
                      All
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="folders">
                      Folders
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
                <Tabs.Panel id="all">
                  <div className="library-content">
                    {isLibraryEmpty ? (
                      <LibraryEmptyState onCreateFolder={createFolder} />
                    ) : (
                      <MediaGallery
                        items={visibleItems}
                        onMoveItem={setMoveItemId}
                        onRemoveItem={setRemoveItemId}
                      />
                    )}
                  </div>
                </Tabs.Panel>
                <Tabs.Panel id="folders">
                  <div className="library-content">
                    <FolderGallery folders={visibleFolders} />
                  </div>
                </Tabs.Panel>
              </Tabs>
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
    </div>
  )
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
