import type { drive_v3 } from "googleapis"
import { libraryFolderSchema, libraryItemSchema } from "@akasha/contracts"
import type { LibraryFolder, LibraryItem, MediaKind } from "@akasha/contracts"

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
    throw new Error("Akasha could not initialize the library root.")
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
  if (file.appProperties?.stillroomType === "poster") return null

  const captureMetadata = parseCaptureMetadata(file.description)
  const sourceUrl = captureMetadata.sourceUrl ?? file.webViewLink

  if (!file.id || !file.name || !file.createdTime || !sourceUrl) {
    return null
  }

  const result = libraryItemSchema.safeParse({
    byteSize: parseByteSize(file.size),
    capturedAt: file.createdTime,
    driveFileId: file.id,
    durationSeconds:
      parseDurationSeconds(file.videoMediaMetadata?.durationMillis) ??
      normalizeDurationSeconds(captureMetadata.durationSeconds),
    folderId,
    height:
      file.imageMediaMetadata?.height ??
      file.videoMediaMetadata?.height ??
      captureMetadata.height,
    id: file.id,
    kind: parseMediaKind(file),
    mimeType: file.mimeType ?? undefined,
    sourceLabel: getSourceLabel(sourceUrl),
    sourceUrl,
    storageMode:
      captureMetadata.storageMode ??
      (file.mimeType === "application/json" ? "reference" : "binary"),
    thumbnailUrl: getThumbnailUrl(file, captureMetadata),
    title: captureMetadata.title ?? removeFileExtension(file.name),
    width:
      file.imageMediaMetadata?.width ??
      file.videoMediaMetadata?.width ??
      captureMetadata.width,
  })

  return result.success ? result.data : null
}

type CaptureMetadata = {
  durationSeconds?: number
  height?: number
  pageUrl?: string
  posterDriveFileId?: string
  sourceUrl?: string
  storageMode?: "binary" | "reference"
  thumbnailUrl?: string
  title?: string
  width?: number
}

function getThumbnailUrl(
  file: drive_v3.Schema$File,
  captureMetadata: CaptureMetadata
) {
  if (file.appProperties?.stillroomKind !== "video") {
    return `/api/media/${file.id}`
  }

  return captureMetadata.posterDriveFileId
    ? `/api/media/${captureMetadata.posterDriveFileId}`
    : captureMetadata.thumbnailUrl
}

function parseByteSize(size?: string | null) {
  if (!size) return undefined
  const value = Number(size)
  return Number.isSafeInteger(value) && value >= 0 ? value : undefined
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

function normalizeDurationSeconds(duration?: number) {
  return duration !== undefined && Number.isFinite(duration)
    ? Math.round(duration)
    : undefined
}

function getSourceLabel(sourceUrl: string) {
  return new URL(sourceUrl).hostname.replace(/^www\./, "")
}

function removeFileExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "")
}
