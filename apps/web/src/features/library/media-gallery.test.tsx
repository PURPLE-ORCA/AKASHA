// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { LibraryItem } from "@akasha/contracts"

import { MediaGallery } from "./media-gallery"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function createItem(
  kind: LibraryItem["kind"],
  overrides: Partial<LibraryItem> = {}
): LibraryItem {
  return {
    capturedAt: "2026-08-23T10:00:00.000Z",
    driveFileId: `${kind}-file`,
    folderId: "references",
    id: kind,
    kind,
    mimeType: kind === "image" ? "image/jpeg" : "video/mp4",
    sourceLabel: "example.com",
    sourceUrl: `https://example.com/${kind}`,
    storageMode: "binary",
    thumbnailUrl: `/api/media/${kind}-file`,
    title: `${kind} reference`,
    ...overrides,
  }
}

function renderGallery(items: LibraryItem[]) {
  render(
    <MediaGallery
      items={items}
      onMoveItem={vi.fn()}
      onOpenFolder={vi.fn()}
      onRemoveItem={vi.fn()}
    />
  )
}

describe("MediaGallery context menu", () => {
  it("downloads the full image with its title and file extension", async () => {
    let downloadLink: HTMLAnchorElement | undefined
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      function captureDownload(this: HTMLAnchorElement) {
        downloadLink = this
      }
    )
    renderGallery([createItem("image")])

    fireEvent.contextMenu(
      screen.getByRole("button", { name: "Open image reference" })
    )
    fireEvent.click(await screen.findByRole("menuitem", { name: "Download" }))

    expect(downloadLink?.getAttribute("href")).toBe("/api/media/image-file")
    expect(downloadLink?.download).toBe("image reference.jpg")
  })

  it("does not offer downloads for videos", async () => {
    renderGallery([createItem("video")])

    fireEvent.contextMenu(
      screen.getByRole("button", { name: "Open video reference" })
    )

    expect(await screen.findByRole("menuitem", { name: "Move to folder" }))
    expect(screen.queryByRole("menuitem", { name: "Download" })).toBeNull()
  })
})
