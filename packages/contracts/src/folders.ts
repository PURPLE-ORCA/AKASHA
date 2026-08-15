import type { LibraryFolder } from "./library"

export type FolderTreeNode = LibraryFolder & {
  children: FolderTreeNode[]
}

export function buildFolderTree(folders: LibraryFolder[]): FolderTreeNode[] {
  const nodes = new Map<string, FolderTreeNode>(
    folders.map((folder) => [folder.id, { ...folder, children: [] }])
  )
  const roots: FolderTreeNode[] = []

  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined

    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

export function getFolderPath(folders: LibraryFolder[], folderId: string): LibraryFolder[] {
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]))
  const path: LibraryFolder[] = []
  const visitedFolderIds = new Set<string>()
  let currentFolder = foldersById.get(folderId)

  while (currentFolder && !visitedFolderIds.has(currentFolder.id)) {
    path.unshift(currentFolder)
    visitedFolderIds.add(currentFolder.id)
    currentFolder = currentFolder.parentId ? foldersById.get(currentFolder.parentId) : undefined
  }

  return path
}
