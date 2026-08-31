import { getFolderDescendantIds } from "@akasha/contracts"
import type { LibraryFolder, LibraryItem } from "@akasha/contracts"

export function getFolderMoveDestinations(
  folders: LibraryFolder[],
  rootFolderId: string,
  folder: LibraryFolder | null
) {
  if (!folder) return []

  const blockedFolderIds = getFolderDescendantIds(folders, folder.id)
  blockedFolderIds.add(folder.id)

  return [
    { id: rootFolderId, name: "Akasha", parentId: null },
    ...folders,
  ].filter((destination) => !blockedFolderIds.has(destination.id))
}

export function getFolderRemovalSummary(
  folders: LibraryFolder[],
  items: LibraryItem[],
  folder: LibraryFolder | null
) {
  if (!folder) return { assetCount: 0, nestedFolderCount: 0 }

  const affectedFolderIds = getFolderDescendantIds(folders, folder.id)
  const nestedFolderCount = affectedFolderIds.size
  affectedFolderIds.add(folder.id)

  return {
    assetCount: items.filter((item) => affectedFolderIds.has(item.folderId))
      .length,
    nestedFolderCount,
  }
}
