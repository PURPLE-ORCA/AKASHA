import type { LibraryFolder } from "@akasha/contracts"
import type { drive_v3 } from "googleapis"

import type { GoogleTokenCredentials } from "../auth/google-oauth.server"
import { listStillroomFolders } from "./drive.server"

export type ExtensionFolderOption = {
  id: string
  label: string
}

export async function listExtensionFolderOptions(
  credentials: GoogleTokenCredentials
) {
  const { folders, root } = await listStillroomFolders(credentials)

  if (!root.id) {
    throw new Error("Akasha could not initialize the library root.")
  }

  return buildExtensionFolderOptions({
    folders: buildReachableFolders(root.id, folders),
    rootFolderId: root.id,
  })
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

export function buildReachableFolders(
  rootFolderId: string,
  driveFolders: drive_v3.Schema$File[]
) {
  const childrenByParent = new Map<string, drive_v3.Schema$File[]>()

  for (const folder of driveFolders) {
    for (const parentId of folder.parents ?? []) {
      const siblings = childrenByParent.get(parentId) ?? []
      siblings.push(folder)
      childrenByParent.set(parentId, siblings)
    }
  }

  const folders: LibraryFolder[] = []
  const pending = [
    { driveFolderId: rootFolderId, parentId: null as string | null },
  ]
  const visited = new Set([rootFolderId])

  while (pending.length > 0) {
    const current = pending.shift()
    if (!current) break

    for (const folder of childrenByParent.get(current.driveFolderId) ?? []) {
      if (!folder.id || !folder.name || visited.has(folder.id)) continue

      folders.push({
        id: folder.id,
        name: folder.name,
        parentId: current.parentId,
      })
      visited.add(folder.id)
      pending.push({ driveFolderId: folder.id, parentId: folder.id })
    }
  }

  return folders
}
