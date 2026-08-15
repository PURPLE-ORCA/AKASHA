import { describe, expect, it } from "vitest"

import { mapDriveFileToLibraryItem } from "./library.server"

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
})
