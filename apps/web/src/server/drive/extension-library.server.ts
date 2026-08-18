import type { LibraryFolder } from "@akasha/contracts"

import { loadDriveLibrary } from "./library.server"

export type ExtensionFolderOption = {
  id: string
  label: string
}

export async function listExtensionFolderOptions(refreshToken: string) {
  const snapshot = await loadDriveLibrary(refreshToken)
  return buildExtensionFolderOptions(snapshot)
}

export function buildExtensionFolderOptions(snapshot: {
  folders: LibraryFolder[]
  rootFolderId: string
}) {
  const childrenByParent = new Map<string | null, LibraryFolder[]>()

  for (const folder of snapshot.folders) {
    const siblings = childrenByParent.get(folder.parentId) ?? []
    siblings.push(folder)
    childrenByParent.set(folder.parentId, siblings)
  }

  const options: ExtensionFolderOption[] = [
    { id: snapshot.rootFolderId, label: "Akasha" },
  ]
  appendFolderOptions(null, 1, childrenByParent, options)
  return options
}

function appendFolderOptions(
  parentId: string | null,
  depth: number,
  childrenByParent: Map<string | null, LibraryFolder[]>,
  options: ExtensionFolderOption[]
) {
  const children = [...(childrenByParent.get(parentId) ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  for (const child of children) {
    options.push({
      id: child.id,
      label: `${"— ".repeat(depth)}${child.name}`,
    })
    appendFolderOptions(child.id, depth + 1, childrenByParent, options)
  }
}
