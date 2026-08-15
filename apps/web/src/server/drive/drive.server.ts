import { google } from "googleapis"

import { createGoogleOAuthClient } from "../auth/google-oauth.server"
import { buildFolderChildrenQuery } from "./drive-query"

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder"
const ROOT_PROPERTY_KEY = "stillroomRole"
const ROOT_PROPERTY_VALUE = "root"
const FILE_FIELDS =
  "files(id,name,mimeType,parents,description,thumbnailLink,webContentLink,webViewLink,appProperties,imageMediaMetadata,videoMediaMetadata,createdTime)"

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
      name: "Stillroom",
    },
  })

  return createdRoot.data
}

export async function listFolderChildren(
  refreshToken: string,
  folderId: string
) {
  const drive = createDriveClient(refreshToken)
  const response = await drive.files.list({
    fields: FILE_FIELDS,
    orderBy: "folder,name_natural",
    pageSize: 1000,
    q: buildFolderChildrenQuery(folderId),
    spaces: "drive",
  })

  return response.data.files ?? []
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
