import type { CaptureDraft } from "@stillroom/contracts"

const DRIVE_API_URL = "https://www.googleapis.com/drive/v3"
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3"
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder"
const ROOT_ROLE_KEY = "stillroomRole"
const ROOT_ROLE_VALUE = "root"

type DriveFile = {
  id: string
  name: string
  mimeType?: string
  parents?: string[]
}

export type FolderOption = {
  id: string
  label: string
}

export async function connectDrive() {
  await getAccessToken(true)
  return listFolderOptions(false)
}

export async function listFolderOptions(interactive: boolean) {
  const accessToken = await getAccessToken(interactive)
  const root = await ensureStillroomRoot(accessToken)
  const folders = await listFolders(accessToken)

  return flattenFolders(root, folders)
}

export async function saveCapture(draft: CaptureDraft, folderId: string) {
  const accessToken = await getAccessToken(false)

  if (draft.kind === "image") {
    return uploadImage(accessToken, draft, folderId)
  }

  return createVideoReference(accessToken, draft, folderId)
}

async function getAccessToken(interactive: boolean) {
  const result = await browser.identity.getAuthToken({ interactive })

  if (!result?.token) {
    throw new Error("Google authorization is required.")
  }

  return result.token
}

async function ensureStillroomRoot(accessToken: string) {
  const query = `appProperties has { key='${ROOT_ROLE_KEY}' and value='${ROOT_ROLE_VALUE}' } and mimeType='${FOLDER_MIME_TYPE}' and trashed = false`
  const matches = await driveRequest<{ files?: DriveFile[] }>(
    `/files?q=${encodeURIComponent(query)}&spaces=drive&fields=files(id,name,mimeType,parents)`,
    accessToken
  )
  const existingRoot = matches.files?.[0]

  if (existingRoot) {
    return existingRoot
  }

  return driveRequest<DriveFile>("/files?fields=id,name,mimeType,parents", accessToken, {
    method: "POST",
    body: JSON.stringify({
      appProperties: { [ROOT_ROLE_KEY]: ROOT_ROLE_VALUE },
      mimeType: FOLDER_MIME_TYPE,
      name: "Stillroom",
    }),
  })
}

async function listFolders(accessToken: string) {
  const query = `mimeType='${FOLDER_MIME_TYPE}' and trashed = false`
  const response = await driveRequest<{ files?: DriveFile[] }>(
    `/files?q=${encodeURIComponent(query)}&spaces=drive&pageSize=1000&fields=files(id,name,mimeType,parents)`,
    accessToken
  )

  return response.files ?? []
}

function flattenFolders(root: DriveFile, folders: DriveFile[]) {
  const childrenByParent = new Map<string, DriveFile[]>()

  for (const folder of folders) {
    for (const parentId of folder.parents ?? []) {
      const siblings = childrenByParent.get(parentId) ?? []
      siblings.push(folder)
      childrenByParent.set(parentId, siblings)
    }
  }

  const options: FolderOption[] = [{ id: root.id, label: root.name }]
  appendFolderOptions(root.id, 1, childrenByParent, options)

  return options
}

function appendFolderOptions(
  parentId: string,
  depth: number,
  childrenByParent: Map<string, DriveFile[]>,
  options: FolderOption[]
) {
  const children = [...(childrenByParent.get(parentId) ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  for (const child of children) {
    options.push({ id: child.id, label: `${"— ".repeat(depth)}${child.name}` })
    appendFolderOptions(child.id, depth + 1, childrenByParent, options)
  }
}

async function uploadImage(accessToken: string, draft: CaptureDraft, folderId: string) {
  const sourceResponse = await fetch(draft.sourceUrl, { credentials: "omit" })

  if (!sourceResponse.ok) {
    throw new Error("The source image could not be downloaded.")
  }

  const image = await sourceResponse.blob()
  const metadata = createFileMetadata(draft, folderId, image.type || "image/jpeg")
  const body = new FormData()
  body.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }))
  body.append("file", image, metadata.name)

  return uploadRequest(accessToken, body)
}

async function createVideoReference(accessToken: string, draft: CaptureDraft, folderId: string) {
  const reference = new Blob([JSON.stringify(draft)], { type: "application/json" })
  const metadata = createFileMetadata(draft, folderId, "application/json")
  const body = new FormData()
  body.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }))
  body.append("file", reference, `${slugify(draft.title)}.stillroom.json`)

  return uploadRequest(accessToken, body)
}

function createFileMetadata(draft: CaptureDraft, folderId: string, mimeType: string) {
  const extension = mimeType.split("/")[1]?.split(";")[0] || "jpg"
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
      title: draft.title,
    }),
    mimeType,
    name: fileName,
    parents: [folderId],
  }
}

async function uploadRequest(accessToken: string, body: FormData) {
  const response = await fetch(
    `${DRIVE_UPLOAD_URL}/files?uploadType=multipart&fields=id,name,mimeType,parents,thumbnailLink,appProperties,createdTime`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    }
  )

  if (!response.ok) {
    throw new Error("Stillroom could not save this item.")
  }

  return response.json() as Promise<DriveFile>
}

async function driveRequest<T>(path: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(`${DRIVE_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error("Stillroom could not reach your library.")
  }

  return response.json() as Promise<T>
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
