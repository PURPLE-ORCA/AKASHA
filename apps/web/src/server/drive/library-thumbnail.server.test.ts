import { afterEach, describe, expect, it } from "vitest"

import { verifyDriveThumbnailToken } from "./drive-thumbnail.server"
import { buildDriveLibrarySnapshot } from "./library.server"

const createdTime = "2026-08-23T10:00:00.000Z"
const sourceUrl = "https://example.com/reference"
const secret = "a-secure-session-secret-with-32-characters"

afterEach(() => {
  delete process.env.SESSION_SECRET
})

function getThumbnailPayload(thumbnailUrl?: string) {
  const token = new URL(thumbnailUrl!, "https://akasha.test").searchParams.get(
    "preview"
  )
  return verifyDriveThumbnailToken(token!, { secret })
}

describe("Drive library thumbnails", () => {
  it("maps Drive thumbnails to preview URLs without using original media", () => {
    process.env.SESSION_SECRET = secret
    const snapshot = buildDriveLibrarySnapshot("root", [
      {
        appProperties: { stillroomKind: "image", stillroomType: "item" },
        createdTime,
        description: JSON.stringify({ sourceUrl }),
        id: "image-with-preview",
        mimeType: "image/jpeg",
        name: "preview.jpg",
        parents: ["root"],
        thumbnailLink: "https://lh3.googleusercontent.com/preview",
      },
      {
        appProperties: { stillroomKind: "image", stillroomType: "item" },
        createdTime,
        description: JSON.stringify({ sourceUrl }),
        id: "image-without-preview",
        mimeType: "image/jpeg",
        name: "no-preview.jpg",
        parents: ["root"],
      },
    ])

    expect(snapshot.items[1]?.thumbnailUrl).toBeUndefined()
    expect(getThumbnailPayload(snapshot.items[0]?.thumbnailUrl)).toMatchObject({
      fileId: "image-with-preview",
      thumbnailUrl: "https://lh3.googleusercontent.com/preview",
    })
  })

  it("uses only a sibling poster asset for a video preview", () => {
    process.env.SESSION_SECRET = secret
    const snapshot = buildDriveLibrarySnapshot("root", [
      {
        appProperties: { stillroomKind: "video", stillroomType: "item" },
        createdTime,
        description: JSON.stringify({
          posterDriveFileId: "poster",
          sourceUrl,
        }),
        id: "video",
        mimeType: "video/mp4",
        name: "video.mp4",
        parents: ["root"],
      },
      {
        appProperties: { stillroomType: "poster" },
        id: "poster",
        mimeType: "image/jpeg",
        name: "poster.jpg",
        parents: ["root"],
        thumbnailLink: "https://lh3.googleusercontent.com/poster",
      },
    ])

    expect(getThumbnailPayload(snapshot.items[0]?.thumbnailUrl)).toMatchObject({
      fileId: "poster",
    })
  })

  it("rejects poster references outside the video's folder", () => {
    process.env.SESSION_SECRET = secret
    const snapshot = buildDriveLibrarySnapshot("root", [
      {
        appProperties: { stillroomKind: "video", stillroomType: "item" },
        createdTime,
        description: JSON.stringify({
          posterDriveFileId: "outside-poster",
          sourceUrl,
        }),
        id: "video",
        mimeType: "video/mp4",
        name: "video.mp4",
        parents: ["root"],
      },
      {
        appProperties: { stillroomType: "poster" },
        id: "outside-poster",
        mimeType: "image/jpeg",
        name: "poster.jpg",
        parents: ["outside"],
        thumbnailLink: "https://lh3.googleusercontent.com/poster",
      },
    ])

    expect(snapshot.items[0]?.thumbnailUrl).toBeUndefined()
  })
})
