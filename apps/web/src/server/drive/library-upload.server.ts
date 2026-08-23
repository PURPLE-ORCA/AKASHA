import type { GoogleTokenCredentials } from "../auth/google-oauth.server"
import { listStillroomFolders } from "./drive.server"
import { buildReachableFolders } from "./extension-library.server"

export class LibraryUploadDestinationError extends Error {
  constructor() {
    super("Choose a folder inside Akasha.")
    this.name = "LibraryUploadDestinationError"
  }
}

export async function assertLibraryUploadDestination(
  credentials: GoogleTokenCredentials,
  folderId: string
) {
  const { folders, root } = await listStillroomFolders(credentials)

  if (!root.id) {
    throw new Error("Akasha could not initialize the library root.")
  }
  if (!isLibraryUploadDestination(root.id, folders, folderId)) {
    throw new LibraryUploadDestinationError()
  }

  return folderId
}

export function isLibraryUploadDestination(
  rootFolderId: string,
  driveFolders: Parameters<typeof buildReachableFolders>[1],
  folderId: string
) {
  if (folderId === rootFolderId) return true

  return buildReachableFolders(rootFolderId, driveFolders).some(
    (folder) => folder.id === folderId
  )
}
