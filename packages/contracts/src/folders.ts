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

export function getFolderDescendantIds(folders: LibraryFolder[], folderId: string) {
  const childrenByParent = new Map<string, string[]>()

  for (const folder of folders) {
    if (!folder.parentId) continue
    const children = childrenByParent.get(folder.parentId) ?? []
    children.push(folder.id)
    childrenByParent.set(folder.parentId, children)
  }

  const descendants = new Set<string>()
  const pending = [...(childrenByParent.get(folderId) ?? [])]
  const visited = new Set([folderId])

  while (pending.length > 0) {
    const descendantId = pending.shift()
    if (!descendantId || visited.has(descendantId)) continue

    visited.add(descendantId)
    descendants.add(descendantId)
    pending.push(...(childrenByParent.get(descendantId) ?? []))
  }

  return descendants
}
