import { isIP } from "node:net"
import { Readable } from "node:stream"
import type { CaptureDraft } from "@akasha/contracts"
import { google } from "googleapis"
import type { drive_v3 } from "googleapis"

import { createGoogleOAuthClient } from "../auth/google-oauth.server"
import { buildFolderChildrenQuery } from "./drive-query"

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder"
const ROOT_PROPERTY_KEY = "stillroomRole"
const ROOT_PROPERTY_VALUE = "root"
const FILE_FIELDS =
  "nextPageToken,files(id,name,mimeType,parents,description,thumbnailLink,webContentLink,webViewLink,appProperties,imageMediaMetadata,videoMediaMetadata,createdTime)"

export { FOLDER_MIME_TYPE }

export function createDriveClient(refreshToken: string) {
  const auth = createGoogleOAuthClient()
  auth.setCredentials({ refresh_token: refreshToken })

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
  refreshToken: string,
  draft: CaptureDraft,
  folderId: string
) {
  const drive = createDriveClient(refreshToken)

  if (draft.kind === "video") {
    const body = Buffer.from(JSON.stringify(draft))
    const response = await drive.files.create({
      fields:
        "id,name,mimeType,parents,thumbnailLink,appProperties,createdTime",
      media: {
        body: Readable.from(body),
        mimeType: "application/json",
      },
      requestBody: createCaptureMetadata(draft, folderId, "application/json"),
    })

    return response.data
  }

  assertSafeRemoteSourceUrl(draft.sourceUrl)
  const sourceResponse = await fetch(draft.sourceUrl, {
    headers: { "User-Agent": "Akasha Capture/1.0" },
    redirect: "follow",
  })

  if (!sourceResponse.ok) {
    throw new Error("The source image could not be downloaded.")
  }

  const contentLength = Number(sourceResponse.headers.get("Content-Length"))
  const maximumImageBytes = 20 * 1024 * 1024

  if (Number.isFinite(contentLength) && contentLength > maximumImageBytes) {
    throw new Error("This image is too large to save.")
  }

  const body = Buffer.from(await sourceResponse.arrayBuffer())

  if (body.byteLength > maximumImageBytes) {
    throw new Error("This image is too large to save.")
  }

  const mimeType =
    sourceResponse.headers.get("Content-Type")?.split(";")[0] || "image/jpeg"
  const response = await drive.files.create({
    fields: "id,name,mimeType,parents,thumbnailLink,appProperties,createdTime",
    media: { body: Readable.from(body), mimeType },
    requestBody: createCaptureMetadata(draft, folderId, mimeType),
  })

  return response.data
}

function createCaptureMetadata(
  draft: CaptureDraft,
  folderId: string,
  mimeType: string
) {
  const extension =
    mimeType.split("/")[1]?.replace(/[^a-z0-9.+-]/gi, "") || "jpg"
  const fileName =
    draft.kind === "video"
      ? `${slugify(draft.title)}.stillroom.json`
      : `${slugify(draft.title)}.${extension}`

  return {
    appProperties: {
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

function assertSafeRemoteSourceUrl(value: string) {
  const url = new URL(value)
  const hostname = url.hostname.toLowerCase()

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Akasha can only save remote images.")
  }

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    isPrivateIpAddress(hostname)
  ) {
    throw new Error("Akasha cannot download images from private addresses.")
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
