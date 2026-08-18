import { isIP } from "node:net"
import { Readable, Transform } from "node:stream"
import type { ReadableStream as NodeReadableStream } from "node:stream/web"
import type { CaptureDraft } from "@akasha/contracts"
import { google } from "googleapis"
import type { drive_v3 } from "googleapis"

import type { GoogleTokenCredentials } from "../auth/google-oauth.server"
import { createGoogleOAuthClient } from "../auth/google-oauth.server"
import { buildFolderChildrenQuery } from "./drive-query"

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder"
const ROOT_PROPERTY_KEY = "stillroomRole"
const ROOT_PROPERTY_VALUE = "root"
const FILE_FIELDS =
  "nextPageToken,files(id,name,mimeType,parents,description,thumbnailLink,webContentLink,webViewLink,appProperties,imageMediaMetadata,videoMediaMetadata,createdTime)"

export { FOLDER_MIME_TYPE }

type DriveCredentialInput = GoogleTokenCredentials | string

export type CaptureSaveTimings = {
  driveUploadMs: number
  idempotencyMs: number
  sourceResponseMs: number
}

export class CaptureSourceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CaptureSourceError"
  }
}

export function createDriveClient(credentials: DriveCredentialInput) {
  const auth = createGoogleOAuthClient()
  const normalizedCredentials = normalizeDriveCredentials(credentials)
  auth.setCredentials({
    access_token: normalizedCredentials.accessToken,
    expiry_date: normalizedCredentials.accessTokenExpiresAt,
    refresh_token: normalizedCredentials.refreshToken,
  })

  return google.drive({ version: "v3", auth })
}

export async function ensureStillroomRoot(refreshToken: string) {
  const drive = createDriveClient(refreshToken)
  const existingRoots = await drive.files.list({
    fields: FILE_FIELDS,
    q: `appProperties has { key='${ROOT_PROPERTY_KEY}' and value='${ROOT_PROPERTY_VALUE}' } and mimeType='${FOLDER_MIME_TYPE}' and trashed = false`,
    spaces: "drive",
  })
  const existingRoot = existingRoots.data.files?.[0]

  if (existingRoot?.id) {
    return existingRoot
  }

  const createdRoot = await drive.files.create({
    fields: "id,name,mimeType,parents,appProperties,createdTime",
    requestBody: {
      appProperties: { [ROOT_PROPERTY_KEY]: ROOT_PROPERTY_VALUE },
      mimeType: FOLDER_MIME_TYPE,
      name: "Akasha",
    },
  })

  return createdRoot.data
}

export async function listFolderChildren(
  refreshToken: string,
  folderId: string
) {
  const drive = createDriveClient(refreshToken)
  return listDriveFiles(drive, buildFolderChildrenQuery(folderId))
}

export async function listStillroomFiles(refreshToken: string) {
  const drive = createDriveClient(refreshToken)
  return listDriveFiles(drive, "trashed = false")
}

export async function listStillroomFolders(credentials: DriveCredentialInput) {
  const drive = createDriveClient(credentials)
  const folders: drive_v3.Schema$File[] = []
  let pageToken: string | undefined

  do {
    const response = await drive.files.list({
      fields: "nextPageToken,files(id,name,parents,appProperties)",
      orderBy: "name_natural",
      pageSize: 1000,
      pageToken,
      q: `mimeType='${FOLDER_MIME_TYPE}' and trashed = false`,
      spaces: "drive",
    })

    folders.push(...(response.data.files ?? []))
    pageToken = response.data.nextPageToken ?? undefined
  } while (pageToken)

  const existingRoot = folders.find(
    (folder) =>
      folder.appProperties?.[ROOT_PROPERTY_KEY] === ROOT_PROPERTY_VALUE
  )

  if (existingRoot?.id) {
    return { folders, root: existingRoot }
  }

  const createdRoot = await drive.files.create({
    fields: "id,name,parents,appProperties",
    requestBody: {
      appProperties: { [ROOT_PROPERTY_KEY]: ROOT_PROPERTY_VALUE },
      mimeType: FOLDER_MIME_TYPE,
      name: "Akasha",
    },
  })

  return { folders: [...folders, createdRoot.data], root: createdRoot.data }
}

async function listDriveFiles(drive: drive_v3.Drive, query: string) {
  const files: drive_v3.Schema$File[] = []
  let pageToken: string | undefined

  do {
    const response = await drive.files.list({
      fields: FILE_FIELDS,
      orderBy: "folder,name_natural",
      pageSize: 1000,
      pageToken,
      q: query,
      spaces: "drive",
    })

    files.push(...(response.data.files ?? []))
    pageToken = response.data.nextPageToken ?? undefined
  } while (pageToken)

  return files
}

export async function createFolder(
  refreshToken: string,
  parentFolderId: string,
  name: string
) {
  const drive = createDriveClient(refreshToken)
  const response = await drive.files.create({
    fields: "id,name,mimeType,parents,appProperties,createdTime",
    requestBody: {
      appProperties: { stillroomType: "folder" },
      mimeType: FOLDER_MIME_TYPE,
      name,
      parents: [parentFolderId],
    },
  })

  return response.data
}

export async function moveFile(
  refreshToken: string,
  fileId: string,
  destinationFolderId: string
) {
  const drive = createDriveClient(refreshToken)
  const currentFile = await drive.files.get({ fileId, fields: "parents" })
  const previousParents = currentFile.data.parents?.join(",")
  const response = await drive.files.update({
    addParents: destinationFolderId,
    fileId,
    fields: "id,name,mimeType,parents,appProperties,createdTime",
    removeParents: previousParents,
  })

  return response.data
}

export async function trashFile(refreshToken: string, fileId: string) {
  const drive = createDriveClient(refreshToken)
  const response = await drive.files.update({
    fileId,
    fields: "id,trashed",
    requestBody: { trashed: true },
  })

  return response.data
}

export async function saveCapture(
  credentials: DriveCredentialInput,
  draft: CaptureDraft,
  folderId: string,
  options: { attempt?: number; captureId?: string } = {}
) {
  const drive = createDriveClient(credentials)
  const timings: CaptureSaveTimings = {
    driveUploadMs: 0,
    idempotencyMs: 0,
    sourceResponseMs: 0,
  }

  if (options.captureId && (options.attempt ?? 1) > 1) {
    const idempotencyStartedAt = performance.now()
    const existingCapture = await findCaptureById(drive, options.captureId)
    timings.idempotencyMs = performance.now() - idempotencyStartedAt

    if (existingCapture) {
      return { file: existingCapture, timings }
    }
  }

  if (draft.kind === "video") {
    const body = Buffer.from(JSON.stringify(draft))
    const driveUploadStartedAt = performance.now()
    const response = await drive.files.create(
      {
        fields:
          "id,name,mimeType,parents,thumbnailLink,appProperties,createdTime",
        media: {
          body: Readable.from(body),
          mimeType: "application/json",
        },
        requestBody: createCaptureMetadata(
          draft,
          folderId,
          "application/json",
          options.captureId
        ),
      },
      { timeout: 60_000 }
    )
    timings.driveUploadMs = performance.now() - driveUploadStartedAt

    return { file: response.data, timings }
  }

  assertSafeRemoteSourceUrl(draft.sourceUrl)
  const sourceRequestStartedAt = performance.now()
  const sourceResponse = await fetch(draft.sourceUrl, {
    headers: { "User-Agent": "Akasha Capture/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  })

  if (!sourceResponse.ok) {
    if (
      sourceResponse.status === 408 ||
      sourceResponse.status === 429 ||
      sourceResponse.status >= 500
    ) {
      throw new Error("The source image is temporarily unavailable.")
    }

    throw new CaptureSourceError("The source image could not be downloaded.")
  }
  timings.sourceResponseMs = performance.now() - sourceRequestStartedAt

  const contentLength = Number(sourceResponse.headers.get("Content-Length"))
  const maximumImageBytes = 20 * 1024 * 1024

  if (Number.isFinite(contentLength) && contentLength > maximumImageBytes) {
    throw new CaptureSourceError("This image is too large to save.")
  }

  if (!sourceResponse.body) {
    throw new CaptureSourceError("The source image did not contain any data.")
  }

  const mimeType =
    sourceResponse.headers.get("Content-Type")?.split(";")[0] || "image/jpeg"
  const sourceStream = Readable.fromWeb(
    sourceResponse.body as unknown as NodeReadableStream
  )
  const limitedStream = sourceStream.pipe(
    createSizeLimitTransform(maximumImageBytes)
  )

  try {
    const driveUploadStartedAt = performance.now()
    const response = await drive.files.create(
      {
        fields:
          "id,name,mimeType,parents,thumbnailLink,appProperties,createdTime",
        media: { body: limitedStream, mimeType },
        requestBody: createCaptureMetadata(
          draft,
          folderId,
          mimeType,
          options.captureId
        ),
      },
      { timeout: 60_000 }
    )
    timings.driveUploadMs = performance.now() - driveUploadStartedAt
    return { file: response.data, timings }
  } finally {
    sourceStream.destroy()
  }
}

function createCaptureMetadata(
  draft: CaptureDraft,
  folderId: string,
  mimeType: string,
  captureId?: string
) {
  const extension =
    mimeType.split("/")[1]?.replace(/[^a-z0-9.+-]/gi, "") || "jpg"
  const fileName =
    draft.kind === "video"
      ? `${slugify(draft.title)}.stillroom.json`
      : `${slugify(draft.title)}.${extension}`

  return {
    appProperties: {
      ...(captureId ? { akashaCaptureId: captureId } : {}),
      stillroomKind: draft.kind,
      stillroomType: "item",
    },
    description: JSON.stringify({
      pageUrl: draft.pageUrl,
      sourceUrl: draft.sourceUrl,
      thumbnailUrl: draft.thumbnailUrl,
      title: draft.title,
    }),
    mimeType,
    name: fileName,
    parents: [folderId],
  }
}

export function createSizeLimitTransform(maximumBytes: number) {
  let receivedBytes = 0

  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      receivedBytes += chunk.byteLength

      if (receivedBytes > maximumBytes) {
        callback(new CaptureSourceError("This image is too large to save."))
        return
      }

      callback(null, chunk)
    },
  })
}

async function findCaptureById(drive: drive_v3.Drive, captureId: string) {
  const response = await drive.files.list({
    fields:
      "files(id,name,mimeType,parents,thumbnailLink,appProperties,createdTime)",
    pageSize: 1,
    q: `appProperties has { key='akashaCaptureId' and value='${captureId}' } and trashed = false`,
    spaces: "drive",
  })

  return response.data.files?.[0]
}

function normalizeDriveCredentials(
  credentials: DriveCredentialInput
): GoogleTokenCredentials {
  return typeof credentials === "string"
    ? { refreshToken: credentials }
    : credentials
}

function assertSafeRemoteSourceUrl(value: string) {
  const url = new URL(value)
  const hostname = url.hostname.toLowerCase()

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new CaptureSourceError("Akasha can only save remote images.")
  }

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    isPrivateIpAddress(hostname)
  ) {
    throw new CaptureSourceError(
      "Akasha cannot download images from private addresses."
    )
  }
}

function isPrivateIpAddress(hostname: string) {
  const ipVersion = isIP(hostname)

  if (ipVersion === 4) {
    const [first = 0, second = 0] = hostname.split(".").map(Number)
    return (
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      first === 0
    )
  }

  if (ipVersion === 6) {
    return (
      hostname === "::1" ||
      hostname === "::" ||
      hostname.startsWith("fc") ||
      hostname.startsWith("fd") ||
      hostname.startsWith("fe8") ||
      hostname.startsWith("fe9") ||
      hostname.startsWith("fea") ||
      hostname.startsWith("feb")
    )
  }

  return false
}

function slugify(value: string) {
  const slug = value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)

  return slug || "saved-inspiration"
}
