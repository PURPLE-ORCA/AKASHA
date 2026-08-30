import { getFolderDescendantIds } from "@akasha/contracts"
import type { LibraryFolder } from "@akasha/contracts"

import {
  createDriveClient,
  listStillroomFolders,
  moveFile,
  trashFile,
} from "./drive.server"
import { buildReachableFolders } from "./extension-library.server"

type FolderActionContext = {
  folder: LibraryFolder
  folders: LibraryFolder[]
  rootFolderId: string
}

export async function renameDriveFolder(
  refreshToken: string,
  folderId: string,
  name: string
) {
  await loadFolderActionContext(refreshToken, folderId)
  const drive = createDriveClient(refreshToken)
  const response = await drive.files.update({
    fields: "id,name,mimeType,parents,appProperties,createdTime",
    fileId: folderId,
    requestBody: { name },
  })

  return response.data
}

export async function moveDriveFolder(
  refreshToken: string,
  folderId: string,
  destinationFolderId: string
) {
  const context = await loadFolderActionContext(refreshToken, folderId)
  assertFolderMoveDestination(context, destinationFolderId)
  return moveFile(refreshToken, folderId, destinationFolderId)
}

export async function trashDriveFolder(
  refreshToken: string,
  folderId: string
) {
  await loadFolderActionContext(refreshToken, folderId)
  return trashFile(refreshToken, folderId)
}

async function loadFolderActionContext(
  refreshToken: string,
  folderId: string
): Promise<FolderActionContext> {
  const { folders: driveFolders, root } = await listStillroomFolders(refreshToken)
  if (!root.id) throw new Error("Akasha could not identify the library root.")

  const folders = buildReachableFolders(root.id, driveFolders)
  const folder = folders.find((candidate) => candidate.id === folderId)
  if (!folder) throw new Error("Choose a folder inside Akasha.")

  return { folder, folders, rootFolderId: root.id }
}

function assertFolderMoveDestination(
  context: FolderActionContext,
  destinationFolderId: string
) {
  const destinationExists =
    destinationFolderId === context.rootFolderId ||
    context.folders.some((folder) => folder.id === destinationFolderId)

  if (!destinationExists) throw new Error("Choose a folder inside Akasha.")

  const descendants = getFolderDescendantIds(
    context.folders,
    context.folder.id
  )
  if (
    destinationFolderId === context.folder.id ||
    descendants.has(destinationFolderId)
  ) {
    throw new Error("A folder cannot be moved inside itself.")
  }
}
