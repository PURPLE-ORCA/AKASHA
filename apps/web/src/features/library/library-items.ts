import { getFolderPath } from "@akasha/contracts"
import type { LibraryFolder, LibraryItem, MediaKind } from "@akasha/contracts"

export type LibrarySortOrder = "newest" | "oldest" | "title"

type FilterLibraryItemsOptions = {
  mediaFilter: "all" | MediaKind
  query: string
  rootFolderId: string
  selectedFolderId: string
  sortOrder: LibrarySortOrder
}

const itemComparators: Record<
  LibrarySortOrder,
  (left: LibraryItem, right: LibraryItem) => number
> = {
  newest: compareNewest,
  oldest: compareOldest,
  title: compareTitles,
}

export function filterLibraryItems(
  items: LibraryItem[],
  folders: LibraryFolder[],
  options: FilterLibraryItemsOptions
) {
  const query = normalizeSearchText(options.query)
  const folderLabels = createFolderLabels(folders)

  return [...items]
    .filter((item) => isItemInScope(item, options, query.length > 0))
    .filter((item) => matchesMediaFilter(item, options.mediaFilter))
    .filter((item) => matchesSearch(item, folderLabels, query))
    .sort(itemComparators[options.sortOrder])
}

function createFolderLabels(folders: LibraryFolder[]) {
  return new Map(
    folders.map((folder) => [
      folder.id,
      getFolderPath(folders, folder.id)
        .map((pathFolder) => pathFolder.name)
        .join(" "),
    ])
  )
}

function isItemInScope(
  item: LibraryItem,
  options: FilterLibraryItemsOptions,
  hasSearchQuery: boolean
) {
  if (hasSearchQuery) return true
  if (options.selectedFolderId === options.rootFolderId) return true
  return item.folderId === options.selectedFolderId
}

function matchesMediaFilter(
  item: LibraryItem,
  mediaFilter: FilterLibraryItemsOptions["mediaFilter"]
) {
  return mediaFilter === "all" || item.kind === mediaFilter
}

function matchesSearch(
  item: LibraryItem,
  folderLabels: ReadonlyMap<string, string>,
  query: string
) {
  if (!query) return true

  return [item.title, item.sourceLabel, folderLabels.get(item.folderId) ?? "Akasha"]
    .map(normalizeSearchText)
    .some((value) => value.includes(query))
}

function compareNewest(left: LibraryItem, right: LibraryItem) {
  const difference = Date.parse(right.capturedAt) - Date.parse(left.capturedAt)
  return difference === 0 ? compareTitles(left, right) : difference
}

function compareOldest(left: LibraryItem, right: LibraryItem) {
  const difference = Date.parse(left.capturedAt) - Date.parse(right.capturedAt)
  return difference === 0 ? compareTitles(left, right) : difference
}

function compareTitles(left: LibraryItem, right: LibraryItem) {
  return left.title.localeCompare(right.title, undefined, { sensitivity: "base" })
}

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase()
}
