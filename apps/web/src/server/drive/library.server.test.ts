import { describe, expect, it } from "vitest"

import {
  buildDriveLibrarySnapshot,
  mapDriveFileToLibraryItem,
} from "./library.server"

describe("mapDriveFileToLibraryItem", () => {
  it("maps captured Drive metadata to a library item", () => {
    const item = mapDriveFileToLibraryItem(
      {
        appProperties: { stillroomKind: "image", stillroomType: "item" },
        createdTime: "2026-08-15T09:00:00.000Z",
        description: JSON.stringify({
          sourceUrl: "https://example.com/reference",
          title: "Reference layout",
        }),
        id: "drive-file-id",
        imageMediaMetadata: { height: 1200, width: 900 },
        mimeType: "image/jpeg",
        name: "reference-layout.jpeg",
      },
      "folder-id"
    )

    expect(item).toMatchObject({
      folderId: "folder-id",
      kind: "image",
      sourceLabel: "example.com",
      thumbnailUrl: "/api/media/drive-file-id",
      title: "Reference layout",
    })
  })

  it("ignores files without source metadata", () => {
    expect(
      mapDriveFileToLibraryItem(
        {
          createdTime: "2026-08-15T09:00:00.000Z",
          id: "drive-file-id",
          name: "untracked.jpeg",
        },
        "folder-id"
      )
    ).toBeNull()
  })

  it("maps an uploaded video and its durable poster", () => {
    expect(
      mapDriveFileToLibraryItem(
        {
          appProperties: { stillroomKind: "video", stillroomType: "item" },
          createdTime: "2026-08-15T09:00:00.000Z",
          description: JSON.stringify({
            durationSeconds: 8.4,
            posterDriveFileId: "poster-id",
            sourceUrl: "https://example.com/interaction.mp4",
            storageMode: "binary",
            title: "Interaction",
          }),
          id: "video-id",
          mimeType: "video/mp4",
          name: "interaction.mp4",
          size: "2048",
          videoMediaMetadata: { height: 720, width: 1280 },
        },
        "folder-id"
      )
    ).toMatchObject({
      byteSize: 2048,
      kind: "video",
      mimeType: "video/mp4",
      storageMode: "binary",
      thumbnailUrl: "/api/media/poster-id",
    })
  })

  it("does not expose poster assets as library items", () => {
    expect(
      mapDriveFileToLibraryItem(
        {
          appProperties: { stillroomType: "poster" },
          createdTime: "2026-08-15T09:00:00.000Z",
          id: "poster-id",
          mimeType: "image/jpeg",
          name: "poster.jpg",
        },
        "folder-id"
      )
    ).toBeNull()
  })
})

describe("buildDriveLibrarySnapshot", () => {
  it("builds a nested library from a single Drive listing", () => {
    const snapshot = buildDriveLibrarySnapshot(
      "root",
      [
        {
          id: "nested",
          mimeType: "application/vnd.google-apps.folder",
          name: "Nested",
          parents: ["folder"],
        },
        {
          id: "folder",
          mimeType: "application/vnd.google-apps.folder",
          name: "Ideas",
          parents: ["root"],
        },
        {
          createdTime: "2026-08-15T09:00:00.000Z",
          description: JSON.stringify({
            sourceUrl: "https://example.com/reference",
          }),
          id: "image",
          mimeType: "image/jpeg",
          name: "reference.jpeg",
          parents: ["nested"],
        },
        {
          id: "unrelated",
          mimeType: "application/vnd.google-apps.folder",
          name: "Unrelated",
          parents: ["outside"],
        },
      ],
      {
        displayName: "Ada Lovelace",
        emailAddress: "ada@example.com",
        photoLink: "https://example.com/ada.jpg",
      }
    )

    expect(snapshot.folders).toEqual([
      { id: "folder", name: "Ideas", parentId: null },
      { id: "nested", name: "Nested", parentId: "folder" },
    ])
    expect(snapshot.items).toMatchObject([{ folderId: "nested", id: "image" }])
    expect(snapshot.user).toEqual({
      displayName: "Ada Lovelace",
      emailAddress: "ada@example.com",
      photoLink: "https://example.com/ada.jpg",
    })
  })
})
