import type { drive_v3 } from "googleapis"
import { libraryFolderSchema, libraryItemSchema } from "@stillroom/contracts"
import type {
  LibraryFolder,
  LibraryItem,
  MediaKind,
} from "@stillroom/contracts"

import {
  ensureStillroomRoot,
  FOLDER_MIME_TYPE,
  listFolderChildren,
} from "./drive.server"

export type DriveLibrarySnapshot = {
  folders: LibraryFolder[]
  items: LibraryItem[]
  rootFolderId: string
}

export async function loadDriveLibrary(
  refreshToken: string
): Promise<DriveLibrarySnapshot> {
  const root = await ensureStillroomRoot(refreshToken)

  if (!root.id) {
    throw new Error("Stillroom could not initialize the library root.")
  }

  const folders: LibraryFolder[] = []
  const items: LibraryItem[] = []
  await collectFolderContents(refreshToken, root.id, null, folders, items)

  return { folders, items, rootFolderId: root.id }
}

async function collectFolderContents(
  refreshToken: string,
  driveFolderId: string,
  productParentId: string | null,
  folders: LibraryFolder[],
  items: LibraryItem[]
) {
  const children = await listFolderChildren(refreshToken, driveFolderId)
  const childFolders = children.filter(
    (child) => child.mimeType === FOLDER_MIME_TYPE
  )

  for (const folder of childFolders) {
    if (!folder.id || !folder.name) {
      continue
    }

    const parsedFolder = libraryFolderSchema.parse({
      id: folder.id,
      name: folder.name,
      parentId: productParentId,
    })
    folders.push(parsedFolder)
    await collectFolderContents(
      refreshToken,
      folder.id,
      folder.id,
      folders,
      items
    )
  }

  for (const file of children) {
    if (file.mimeType === FOLDER_MIME_TYPE || !file.id) {
      continue
    }

    const item = mapDriveFileToLibraryItem(file, driveFolderId)

    if (item) {
      items.push(item)
    }
  }
}

export function mapDriveFileToLibraryItem(
  file: drive_v3.Schema$File,
  folderId: string
) {
  const captureMetadata = parseCaptureMetadata(file.description)
  const sourceUrl = captureMetadata.sourceUrl ?? file.webViewLink

  if (!file.id || !file.name || !file.createdTime || !sourceUrl) {
    return null
  }

  const result = libraryItemSchema.safeParse({
    capturedAt: file.createdTime,
    driveFileId: file.id,
    durationSeconds: parseDurationSeconds(
      file.videoMediaMetadata?.durationMillis
    ),
    folderId,
    height: file.imageMediaMetadata?.height ?? undefined,
    id: file.id,
    kind: parseMediaKind(file),
    sourceLabel: getSourceLabel(sourceUrl),
    sourceUrl,
    thumbnailUrl:
      file.appProperties?.stillroomKind === "video"
        ? captureMetadata.thumbnailUrl
        : `/api/media/${file.id}`,
    title: captureMetadata.title ?? removeFileExtension(file.name),
    width: file.imageMediaMetadata?.width ?? undefined,
  })

  return result.success ? result.data : null
}

type CaptureMetadata = {
  pageUrl?: string
  sourceUrl?: string
  thumbnailUrl?: string
  title?: string
}

function parseCaptureMetadata(description?: string | null): CaptureMetadata {
  if (!description) {
    return {}
  }

  try {
    return JSON.parse(description) as CaptureMetadata
  } catch {
    return {}
  }
}

function parseMediaKind(file: drive_v3.Schema$File): MediaKind {
  if (
    file.appProperties?.stillroomKind === "video" ||
    file.mimeType?.startsWith("video/")
  ) {
    return "video"
  }

  return "image"
}

function parseDurationSeconds(durationMillis?: string | null) {
  if (!durationMillis) {
    return undefined
  }

  const duration = Number(durationMillis)

  return Number.isFinite(duration) ? Math.round(duration / 1000) : undefined
}

function getSourceLabel(sourceUrl: string) {
  return new URL(sourceUrl).hostname.replace(/^www\./, "")
}

function removeFileExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "")
}
