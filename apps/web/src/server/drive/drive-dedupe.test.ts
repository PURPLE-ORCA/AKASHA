import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CONTENT_HASH_PROPERTY } from "./capture-dedupe.server"
import { backfillCaptureDedupeMetadata, saveCapture } from "./drive.server"

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
}))

vi.mock("googleapis", () => ({
  google: {
    drive: () => ({ files: mocks }),
  },
}))

vi.mock("../auth/google-oauth.server", () => ({
  createGoogleOAuthClient: () => ({ setCredentials: vi.fn() }),
}))

const draft = {
  kind: "image" as const,
  pageUrl: "https://example.com/inspiration",
  sourceUrl: "http://8.8.8.8/reference.jpg",
  storageMode: "binary" as const,
  title: "Reference",
}

describe("Drive capture duplicate detection", () => {
  beforeEach(() => {
    mocks.create.mockReset()
    mocks.list.mockReset()
    mocks.update.mockReset()
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(Buffer.from("image-bytes"), {
            headers: { "Content-Type": "image/jpeg" },
          })
      )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns an existing source without downloading or uploading it", async () => {
    mocks.list.mockResolvedValueOnce({
      data: { files: [{ id: "existing", name: "reference.jpg" }] },
    })

    const result = await saveCapture("refresh-token", draft, "folder")

    expect(result).toMatchObject({
      file: { id: "existing" },
      outcome: "already_saved",
    })
    expect(fetch).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("trashes a streamed upload when its content already exists", async () => {
    mocks.list
      .mockResolvedValueOnce({ data: { files: [] } })
      .mockResolvedValueOnce({
        data: { files: [{ id: "existing", name: "original.jpg" }] },
      })
    mocks.create.mockImplementationOnce(async ({ media }) => {
      for await (const _chunk of media.body) void _chunk
      return {
        data: {
          appProperties: { stillroomType: "item" },
          id: "new-upload",
          name: "reference.jpg",
        },
      }
    })
    mocks.update.mockResolvedValueOnce({
      data: { id: "new-upload", trashed: true },
    })

    const result = await saveCapture("refresh-token", draft, "folder")

    expect(result).toMatchObject({
      file: { id: "existing" },
      outcome: "already_saved",
    })
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: "new-upload",
        requestBody: { trashed: true },
      })
    )
  })

  it("annotates a new streamed capture with its content hash", async () => {
    mocks.list.mockResolvedValue({ data: { files: [] } })
    mocks.create.mockImplementationOnce(async ({ media, requestBody }) => {
      for await (const _chunk of media.body) void _chunk
      return {
        data: {
          appProperties: requestBody.appProperties,
          id: "new-upload",
          name: "reference.jpg",
        },
      }
    })
    mocks.update.mockImplementationOnce(async ({ requestBody }) => ({
      data: {
        appProperties: requestBody.appProperties,
        id: "new-upload",
        name: "reference.jpg",
      },
    }))

    const result = await saveCapture("refresh-token", draft, "folder")

    expect(result.outcome).toBe("saved")
    expect(result.file.appProperties?.[CONTENT_HASH_PROPERTY]).toMatch(
      /^[a-f0-9]{64}$/
    )
  })

  it("backfills one bounded metadata page without downloading assets", async () => {
    mocks.list.mockResolvedValueOnce({
      data: {
        files: [
          {
            appProperties: { stillroomKind: "image", stillroomType: "item" },
            description: JSON.stringify({ sourceUrl: draft.sourceUrl }),
            id: "existing",
            mimeType: "image/jpeg",
            sha256Checksum: "ABC123",
          },
        ],
        nextPageToken: "next-page",
      },
    })
    mocks.update.mockResolvedValueOnce({ data: { id: "existing" } })

    const result = await backfillCaptureDedupeMetadata("refresh-token")

    expect(result).toEqual({
      nextPageToken: "next-page",
      scannedCount: 1,
      updatedCount: 1,
    })
    expect(fetch).not.toHaveBeenCalled()
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: "existing",
        requestBody: {
          appProperties: expect.objectContaining({
            [CONTENT_HASH_PROPERTY]: "abc123",
          }),
        },
      })
    )
  })
})
