import { isIP } from "node:net"
import { lookup } from "node:dns/promises"
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
  "nextPageToken,files(id,name,mimeType,size,parents,description,thumbnailLink,webContentLink,webViewLink,appProperties,imageMediaMetadata,videoMediaMetadata,createdTime)"
const IMAGE_MIME_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
])
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm"])
const MAXIMUM_IMAGE_BYTES = 20 * 1024 * 1024
const MAXIMUM_POSTER_BYTES = 5 * 1024 * 1024
const MAXIMUM_VIDEO_BYTES = 50 * 1024 * 1024

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

  if (draft.kind === "video" && draft.storageMode !== "binary") {
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

  const sourceRequestStartedAt = performance.now()
  const sourceResponse = await fetchSafeRemoteSource(draft.sourceUrl, {
    headers: { "User-Agent": "Akasha Capture/1.0" },
    signal: AbortSignal.timeout(15_000),
  })

  if (!sourceResponse.ok) {
    if (
      sourceResponse.status === 408 ||
      sourceResponse.status === 429 ||
      sourceResponse.status >= 500
    ) {
      throw new Error(`The source ${draft.kind} is temporarily unavailable.`)
    }

    throw new CaptureSourceError(
      `The source ${draft.kind} could not be downloaded.`
    )
  }
  timings.sourceResponseMs = performance.now() - sourceRequestStartedAt

  const contentLength = Number(sourceResponse.headers.get("Content-Length"))
  const maximumBytes =
    draft.kind === "video" ? MAXIMUM_VIDEO_BYTES : MAXIMUM_IMAGE_BYTES

  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    throw new CaptureSourceError(`This ${draft.kind} is too large to save.`)
  }

  if (!sourceResponse.body) {
    throw new CaptureSourceError(
      `The source ${draft.kind} did not contain any data.`
    )
  }

  const mimeType = normalizeMediaMimeType(
    sourceResponse.headers.get("Content-Type"),
    draft.kind
  )
  const sourceStream = Readable.fromWeb(
    sourceResponse.body as unknown as NodeReadableStream
  )
  const limitedStream = sourceStream.pipe(
    draft.kind === "video"
      ? createVideoValidationTransform(mimeType, maximumBytes)
      : createSizeLimitTransform(maximumBytes)
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
    let file = response.data

    if (draft.kind === "video" && file.id && draft.thumbnailUrl) {
      const posterDriveFileId = await saveVideoPoster(
        drive,
        draft.thumbnailUrl,
        draft.title,
        folderId,
        options.captureId
      ).catch(() => undefined)

      if (posterDriveFileId) {
        const updated = await drive.files.update({
          fileId: file.id,
          fields:
            "id,name,mimeType,size,parents,thumbnailLink,appProperties,createdTime",
          requestBody: {
            description: createCaptureDescription(draft, posterDriveFileId),
          },
        })
        file = updated.data
      }
    }

    return { file, timings }
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
    draft.kind === "video" && mimeType === "application/json"
      ? `${slugify(draft.title)}.stillroom.json`
      : `${slugify(draft.title)}.${extension}`

  return {
    appProperties: {
      ...(captureId ? { akashaCaptureId: captureId } : {}),
      stillroomKind: draft.kind,
      stillroomType: "item",
    },
    description: createCaptureDescription(draft),
    mimeType,
    name: fileName,
    parents: [folderId],
  }
}

function createCaptureDescription(
  draft: CaptureDraft,
  posterDriveFileId?: string
) {
  return JSON.stringify({
    durationSeconds: draft.durationSeconds,
    height: draft.height,
    pageUrl: draft.pageUrl,
    posterDriveFileId,
    sourceUrl: draft.sourceUrl,
    storageMode: draft.storageMode,
    thumbnailUrl: draft.thumbnailUrl,
    title: draft.title,
    width: draft.width,
  })
}

export function createSizeLimitTransform(
  maximumBytes: number,
  mediaLabel = "image"
) {
  let receivedBytes = 0

  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      receivedBytes += chunk.byteLength

      if (receivedBytes > maximumBytes) {
        callback(
          new CaptureSourceError(`This ${mediaLabel} is too large to save.`)
        )
        return
      }

      callback(null, chunk)
    },
  })
}

export function createVideoValidationTransform(
  mimeType: string,
  maximumBytes: number
) {
  let buffered = Buffer.alloc(0)
  let receivedBytes = 0
  let validated = false

  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      receivedBytes += chunk.byteLength
      if (receivedBytes > maximumBytes) {
        callback(new CaptureSourceError("This video is too large to save."))
        return
      }

      if (validated) {
        callback(null, chunk)
        return
      }

      buffered = Buffer.concat([buffered, chunk])
      if (buffered.byteLength < 12) {
        callback()
        return
      }

      if (!hasSupportedVideoSignature(buffered, mimeType)) {
        callback(new CaptureSourceError("This video format is not supported."))
        return
      }

      validated = true
      callback(null, buffered)
      buffered = Buffer.alloc(0)
    },
    flush(callback) {
      if (!validated) {
        callback(new CaptureSourceError("This video format is not supported."))
        return
      }
      callback()
    },
  })
}

function hasSupportedVideoSignature(bytes: Buffer, mimeType: string) {
  if (mimeType === "video/webm") {
    return bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
  }

  return (
    mimeType === "video/mp4" &&
    bytes.subarray(4, 8).toString("ascii") === "ftyp"
  )
}

function normalizeMediaMimeType(
  value: string | null,
  kind: CaptureDraft["kind"]
) {
  const mimeType = value?.split(";")[0]?.trim().toLowerCase() ?? ""
  const allowedTypes = kind === "video" ? VIDEO_MIME_TYPES : IMAGE_MIME_TYPES

  if (!allowedTypes.has(mimeType)) {
    throw new CaptureSourceError(`This ${kind} format is not supported.`)
  }

  return mimeType
}

async function saveVideoPoster(
  drive: drive_v3.Drive,
  sourceUrl: string,
  title: string,
  folderId: string,
  captureId?: string
) {
  const response = await fetchSafeRemoteSource(sourceUrl, {
    headers: { "User-Agent": "Akasha Capture/1.0" },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok || !response.body) return undefined

  const mimeType = normalizeMediaMimeType(
    response.headers.get("Content-Type"),
    "image"
  )
  const contentLength = Number(response.headers.get("Content-Length"))
  if (Number.isFinite(contentLength) && contentLength > MAXIMUM_POSTER_BYTES) {
    return undefined
  }

  const sourceStream = Readable.fromWeb(
    response.body as unknown as NodeReadableStream
  )

  try {
    const extension = mimeType.split("/")[1] ?? "jpg"
    const created = await drive.files.create({
      fields: "id",
      media: {
        body: sourceStream.pipe(
          createSizeLimitTransform(MAXIMUM_POSTER_BYTES, "poster")
        ),
        mimeType,
      },
      requestBody: {
        appProperties: {
          ...(captureId ? { akashaCaptureId: `${captureId}:poster` } : {}),
          stillroomType: "poster",
        },
        mimeType,
        name: `${slugify(title)}-poster.${extension}`,
        parents: [folderId],
      },
    })
    return created.data.id ?? undefined
  } finally {
    sourceStream.destroy()
  }
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

export async function fetchSafeRemoteSource(
  value: string,
  init: RequestInit = {},
  dependencies: {
    fetcher?: typeof fetch
    resolveAddresses?: (hostname: string) => Promise<string[]>
  } = {}
) {
  const fetcher = dependencies.fetcher ?? fetch
  const resolveAddresses =
    dependencies.resolveAddresses ??
    (async (hostname: string) =>
      (await lookup(hostname, { all: true, verbatim: true })).map(
        (entry) => entry.address
      ))
  let currentUrl = new URL(value)

  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    assertSafeRemoteSourceUrl(currentUrl.toString())
    const hostname = normalizeHostname(currentUrl.hostname)
    const addresses = isIP(hostname)
      ? [hostname]
      : await resolveAddresses(hostname)

    if (addresses.length === 0 || addresses.some(isPrivateIpAddress)) {
      throw new CaptureSourceError(
        "Akasha cannot download media from private addresses."
      )
    }

    const response = await fetcher(currentUrl, { ...init, redirect: "manual" })
    if (![301, 302, 303, 307, 308].includes(response.status)) return response

    const location = response.headers.get("Location")
    await response.body?.cancel()
    if (!location) {
      throw new CaptureSourceError(
        "The media source returned an invalid redirect."
      )
    }
    currentUrl = new URL(location, currentUrl)
  }

  throw new CaptureSourceError("The media source redirected too many times.")
}

function assertSafeRemoteSourceUrl(value: string) {
  const url = new URL(value)
  const hostname = normalizeHostname(url.hostname)

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new CaptureSourceError("Akasha can only save remote media.")
  }

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    isPrivateIpAddress(hostname)
  ) {
    throw new CaptureSourceError(
      "Akasha cannot download media from private addresses."
    )
  }
}

export function isPrivateIpAddress(hostname: string) {
  hostname = normalizeHostname(hostname)
  const ipVersion = isIP(hostname)

  if (ipVersion === 4) {
    const [first = 0, second = 0, third = 0] = hostname.split(".").map(Number)
    return (
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 192 && second === 0) ||
      (first === 198 && [18, 19, 51].includes(second)) ||
      (first === 203 && second === 0 && third === 113) ||
      first === 0 ||
      (first === 100 && second >= 64 && second <= 127) ||
      first >= 224
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
      hostname.startsWith("feb") ||
      hostname.startsWith("ff") ||
      hostname.startsWith("::ffff:")
    )
  }

  return false
}

function normalizeHostname(hostname: string) {
  const normalized = hostname.toLowerCase()
  return normalized.startsWith("[") && normalized.endsWith("]")
    ? normalized.slice(1, -1)
    : normalized
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
