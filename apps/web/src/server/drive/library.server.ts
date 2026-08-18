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
  listStillroomFiles,
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

  const files = await listStillroomFiles(refreshToken)
  return buildDriveLibrarySnapshot(root.id, files)
}

export function buildDriveLibrarySnapshot(
  rootFolderId: string,
  files: drive_v3.Schema$File[]
): DriveLibrarySnapshot {
  const filesByParent = new Map<string, drive_v3.Schema$File[]>()

  for (const file of files) {
    for (const parentId of file.parents ?? []) {
      const siblings = filesByParent.get(parentId) ?? []
      siblings.push(file)
      filesByParent.set(parentId, siblings)
    }
  }

  const folders: LibraryFolder[] = []
  const items: LibraryItem[] = []
  const pendingFolders: Array<{
    driveFolderId: string
    parentId: string | null
  }> = [{ driveFolderId: rootFolderId, parentId: null }]
  const visitedFolderIds = new Set<string>([rootFolderId])

  while (pendingFolders.length > 0) {
    const current = pendingFolders.shift()
    if (!current) break

    for (const file of filesByParent.get(current.driveFolderId) ?? []) {
      if (file.mimeType === FOLDER_MIME_TYPE) {
        if (!file.id || !file.name || visitedFolderIds.has(file.id)) continue

        folders.push(
          libraryFolderSchema.parse({
            id: file.id,
            name: file.name,
            parentId: current.parentId,
          })
        )
        visitedFolderIds.add(file.id)
        pendingFolders.push({ driveFolderId: file.id, parentId: file.id })
        continue
      }

      const item = mapDriveFileToLibraryItem(file, current.driveFolderId)
      if (item) items.push(item)
    }
  }

  return { folders, items, rootFolderId }
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
