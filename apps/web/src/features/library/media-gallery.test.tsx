// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
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
    thumbnailUrl: `/api/media/${kind}-preview?preview=signed-token`,
    title: `${kind} reference`,
    ...overrides,
  }
}

type GalleryOptions = {
  isSelectionMode?: boolean
  onSelectionChange?: (itemId: string, isSelected: boolean) => void
  selectedItemIds?: ReadonlySet<string>
}

function renderGallery(
  items: LibraryItem[],
  {
    isSelectionMode = false,
    onSelectionChange = vi.fn(),
    selectedItemIds = new Set<string>(),
  }: GalleryOptions = {}
) {
  render(
    <MediaGallery
      isSelectionMode={isSelectionMode}
      items={items}
      onMoveItem={vi.fn()}
      onOpenFolder={vi.fn()}
      onRemoveItem={vi.fn()}
      onSelectionChange={onSelectionChange}
      selectedItemIds={selectedItemIds}
    />
  )
}

describe("MediaGallery selection", () => {
  it("selects a card instead of opening its preview in selection mode", () => {
    const onSelectionChange = vi.fn()
    renderGallery([createItem("image")], {
      isSelectionMode: true,
      onSelectionChange,
    })

    fireEvent.click(
      screen.getByRole("button", { name: "Select image reference" })
    )

    expect(onSelectionChange).toHaveBeenCalledWith("image", true)
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(
      screen.getByRole("checkbox", { name: "Select image reference" })
    ).toBeTruthy()
  })

  it("exposes selected cards as pressed and checked", () => {
    renderGallery([createItem("image")], {
      isSelectionMode: true,
      selectedItemIds: new Set(["image"]),
    })

    expect(
      screen
        .getByRole("button", { name: "Deselect image reference" })
        .getAttribute("aria-pressed")
    ).toBe("true")
    expect(
      screen.getByRole("checkbox", {
        name: "Deselect image reference",
      })
    ).toHaveProperty("checked", true)
  })
})

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

describe("MediaGallery image loading", () => {
  it("keeps intrinsic image geometry and limits high-priority previews", () => {
    renderGallery([
      createItem("image", {
        height: 800,
        id: "first",
        title: "First",
        width: 600,
      }),
      createItem("image", { id: "second", title: "Second" }),
      createItem("image", { id: "third", title: "Third" }),
    ])

    const images = screen.getAllByRole("img")
    expect(images).toHaveLength(3)
    expect(images[0]?.getAttribute("fetchpriority")).toBe("high")
    expect(images[0]?.getAttribute("loading")).toBe("eager")
    expect(images[1]?.getAttribute("fetchpriority")).toBe("high")
    expect(images[2]?.getAttribute("fetchpriority")).toBe("auto")
    expect(images[2]?.getAttribute("loading")).toBe("lazy")
    expect(
      images.every((image) => image.getAttribute("decoding") === "async")
    ).toBe(true)
    expect(images[0]?.getAttribute("width")).toBe("600")
    expect(images[0]?.getAttribute("height")).toBe("800")
  })

  it("loads the original only after opening an image", () => {
    renderGallery([createItem("image")])

    expect(screen.getByRole("img").getAttribute("src")).toContain(
      "image-preview?preview="
    )
    expect(
      document.querySelector('img[src="/api/media/image-file"]')
    ).toBeNull()

    fireEvent.click(
      screen.getByRole("button", { name: "Open image reference" })
    )

    const dialog = screen.getByRole("dialog")
    const original = within(dialog).getByRole("img", {
      name: "image reference",
    })
    expect(original.getAttribute("src")).toBe("/api/media/image-file")
    expect(
      dialog.querySelector(
        'img[src="/api/media/image-preview?preview=signed-token"]'
      )
    ).toBeTruthy()
  })

  it("keeps a clean fallback when a preview fails", () => {
    renderGallery([createItem("image")])

    fireEvent.error(screen.getByRole("img"))

    expect(screen.queryByRole("img")).toBeNull()
    expect(
      screen.getByRole("button", { name: "Open image reference" })
    ).toBeTruthy()
  })

  it("ignores a stale decode after keyboard navigation", async () => {
    let finishFirstDecode: (() => void) | undefined
    const firstDecode = new Promise<void>((resolve) => {
      finishFirstDecode = resolve
    })
    renderGallery([
      createItem("image", { id: "first", title: "First" }),
      createItem("image", {
        driveFileId: "second-file",
        id: "second",
        title: "Second",
      }),
    ])

    fireEvent.click(screen.getByRole("button", { name: "Open First" }))
    const dialog = screen.getByRole("dialog")
    const firstOriginal = within(dialog).getByRole("img", {
      name: "First",
    })
    Object.defineProperty(firstOriginal, "decode", {
      configurable: true,
      value: () => firstDecode,
    })
    fireEvent.load(firstOriginal)

    fireEvent.keyDown(window, { key: "ArrowRight" })
    const secondOriginal = within(dialog).getByRole("img", { name: "Second" })

    await act(async () => finishFirstDecode?.())

    expect(secondOriginal.className).not.toContain("opacity-100")
  })
})
