import { createServerFn } from "@tanstack/react-start"
import { setResponseHeaders } from "@tanstack/react-start/server"
import { z } from "zod"

import { useStillroomSession } from "@/server/auth/session.server"
import { createFolder, moveFile, trashFile } from "@/server/drive/drive.server"
import {
  moveDriveFolder,
  renameDriveFolder,
  trashDriveFolder,
} from "@/server/drive/folder-actions.server"
import { loadDriveLibrary } from "@/server/drive/library.server"

const createFolderInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  parentFolderId: z.string().min(1),
})

const moveItemsInputSchema = z.object({
  destinationFolderId: z.string().min(1),
  fileIds: z.array(z.string().min(1)).min(1).max(100),
})

const removeItemsInputSchema = z.object({
  fileIds: z.array(z.string().min(1)).min(1).max(100),
})

const renameFolderInputSchema = z.object({
  folderId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
})

const moveFolderInputSchema = z.object({
  destinationFolderId: z.string().min(1),
  folderId: z.string().min(1),
})

const removeFolderInputSchema = z.object({
  folderId: z.string().min(1),
})

export const getLibrarySnapshot = createServerFn({ method: "GET" }).handler(
  async () => {
    setPrivateNoStoreHeaders()

    if (!process.env.SESSION_SECRET) {
      return { status: "disconnected" as const }
    }

    const session = await useStillroomSession()

    if (!session.data.googleRefreshToken) {
      return { status: "disconnected" as const }
    }

    const snapshot = await loadDriveLibrary(session.data.googleRefreshToken)
    return { snapshot, status: "connected" as const }
  }
)

export const createLibraryFolder = createServerFn({ method: "POST" })
  .validator(createFolderInputSchema)
  .handler(async ({ data }) => {
    setPrivateNoStoreHeaders()
    const refreshToken = await requireRefreshToken()
    return createFolder(refreshToken, data.parentFolderId, data.name)
  })

export const moveLibraryItems = createServerFn({ method: "POST" })
  .validator(moveItemsInputSchema)
  .handler(async ({ data }) => {
    setPrivateNoStoreHeaders()
    const refreshToken = await requireRefreshToken()
    await Promise.all(
      data.fileIds.map((fileId) =>
        moveFile(refreshToken, fileId, data.destinationFolderId)
      )
    )

    return { moved: data.fileIds.length }
  })

export const removeLibraryItems = createServerFn({ method: "POST" })
  .validator(removeItemsInputSchema)
  .handler(async ({ data }) => {
    setPrivateNoStoreHeaders()
    const refreshToken = await requireRefreshToken()
    await Promise.all(
      data.fileIds.map((fileId) => trashFile(refreshToken, fileId))
    )

    return { removed: data.fileIds.length }
  })

export const renameLibraryFolder = createServerFn({ method: "POST" })
  .validator(renameFolderInputSchema)
  .handler(async ({ data }) => {
    setPrivateNoStoreHeaders()
    const refreshToken = await requireRefreshToken()
    return renameDriveFolder(refreshToken, data.folderId, data.name)
  })

export const moveLibraryFolder = createServerFn({ method: "POST" })
  .validator(moveFolderInputSchema)
  .handler(async ({ data }) => {
    setPrivateNoStoreHeaders()
    const refreshToken = await requireRefreshToken()
    return moveDriveFolder(
      refreshToken,
      data.folderId,
      data.destinationFolderId
    )
  })

export const removeLibraryFolder = createServerFn({ method: "POST" })
  .validator(removeFolderInputSchema)
  .handler(async ({ data }) => {
    setPrivateNoStoreHeaders()
    const refreshToken = await requireRefreshToken()
    return trashDriveFolder(refreshToken, data.folderId)
  })

async function requireRefreshToken() {
  if (!process.env.SESSION_SECRET) {
    throw new Error("Connect your library before continuing.")
  }

  const session = await useStillroomSession()

  if (!session.data.googleRefreshToken) {
    throw new Error("Connect your library before continuing.")
  }

  return session.data.googleRefreshToken
}

function setPrivateNoStoreHeaders() {
  setResponseHeaders(
    new Headers({
      "Cache-Control": "private, no-store",
      Vary: "Cookie, Authorization",
    })
  )
}
