import { z } from "zod"

export const mediaKindSchema = z.enum(["image", "video"])

export const captureDraftSchema = z.object({
  kind: mediaKindSchema,
  sourceUrl: z.url(),
  pageUrl: z.url(),
  title: z.string().trim().min(1).max(240),
  thumbnailUrl: z.url().optional(),
})

export const libraryFolderSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  parentId: z.string().min(1).nullable(),
})

export const libraryItemSchema = z.object({
  id: z.string().min(1),
  driveFileId: z.string().min(1),
  folderId: z.string().min(1),
  kind: mediaKindSchema,
  title: z.string().trim().min(1).max(240),
  sourceUrl: z.url(),
  thumbnailUrl: z.url(),
  sourceLabel: z.string().trim().min(1).max(120),
  width: z.int().positive().optional(),
  height: z.int().positive().optional(),
  durationSeconds: z.int().nonnegative().optional(),
  capturedAt: z.iso.datetime(),
})

export const captureRequestSchema = captureDraftSchema.extend({
  folderId: z.string().min(1),
})

export type CaptureDraft = z.infer<typeof captureDraftSchema>
export type CaptureRequest = z.infer<typeof captureRequestSchema>
export type LibraryFolder = z.infer<typeof libraryFolderSchema>
export type LibraryItem = z.infer<typeof libraryItemSchema>
export type MediaKind = z.infer<typeof mediaKindSchema>
