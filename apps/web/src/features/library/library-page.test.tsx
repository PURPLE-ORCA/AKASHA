// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { LibraryPage } from "./library-page"

vi.mock("@tanstack/react-router", async () => {
  const { forwardRef } = await import("react")

  return {
    Link: forwardRef<
      HTMLAnchorElement,
      React.ComponentProps<"a"> & { search?: unknown; to?: string }
    >(function TestLink({ search: _search, to = "/", ...props }, ref) {
      return <a {...props} href={to} ref={ref} />
    }),
    useNavigate: () => vi.fn(),
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("LibraryPage", () => {
  it("shows an empty library with a first-folder action", () => {
    render(
      <LibraryPage
        initialSnapshot={{ folders: [], items: [], rootFolderId: "root" }}
      />
    )

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Akasha")
    expect(
      screen.getByRole("radio", { name: "All" }).getAttribute("aria-checked")
    ).toBe("true")
    expect(screen.getByRole("radio", { name: "Folders" })).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Keyboard shortcuts" })
    ).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Open account menu" })
    ).toBeTruthy()
    expect(screen.getByRole("button", { name: "Create folder" })).toBeTruthy()
    expect(
      screen.getAllByRole("button", { name: "Upload images" })
    ).toHaveLength(2)
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("opens the image picker with the U shortcut", () => {
    const click = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => undefined)

    render(
      <LibraryPage
        initialSnapshot={{ folders: [], items: [], rootFolderId: "root" }}
      />
    )

    fireEvent.keyDown(window, { key: "u" })
    expect(click).toHaveBeenCalledOnce()
  })

  it("shows the current upload destination while files are dragged", () => {
    render(
      <LibraryPage
        initialSnapshot={{ folders: [], items: [], rootFolderId: "root" }}
      />
    )

    const uploadZone = document.querySelector("[data-library-upload-zone]")
    expect(uploadZone).toBeTruthy()
    fireEvent.dragEnter(uploadZone!, { dataTransfer: { types: ["Files"] } })
    expect(screen.getByText("Drop into Akasha")).toBeTruthy()
    fireEvent.dragLeave(uploadZone!, { dataTransfer: { types: ["Files"] } })
    expect(screen.queryByText("Drop into Akasha")).toBeNull()
  })

  it("enters selection mode from the toolbar or M shortcut", () => {
    render(
      <LibraryPage
        initialSnapshot={{
          folders: [],
          items: [createLibraryItem("one", "First asset")],
          rootFolderId: "root",
        }}
      />
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Select multiple assets" })
    )
    expect(
      screen
        .getByRole("button", { name: "Exit selection mode" })
        .getAttribute("aria-pressed")
    ).toBe("true")

    fireEvent.keyDown(window, { key: "Escape" })
    expect(
      screen.getByRole("button", { name: "Select multiple assets" })
    ).toBeTruthy()

    fireEvent.keyDown(window, { key: "m" })
    expect(
      screen.getByRole("checkbox", { name: "Select First asset" })
    ).toBeTruthy()
  })

  it("opens bulk move and delete actions for selected assets", () => {
    render(
      <LibraryPage
        initialSnapshot={{
          folders: [
            { id: "source", name: "Source", parentId: null },
            { id: "target", name: "Target", parentId: null },
          ],
          items: [
            createLibraryItem("one", "First asset", "source"),
            createLibraryItem("two", "Second asset", "source"),
          ],
          rootFolderId: "root",
        }}
      />
    )

    fireEvent.keyDown(window, { key: "m" })
    fireEvent.click(screen.getByRole("button", { name: "Select First asset" }))
    fireEvent.click(screen.getByRole("button", { name: "Select Second asset" }))

    expect(screen.getByText("2 selected")).toBeTruthy()
    fireEvent.click(
      screen.getByRole("button", { name: "Move selected assets" })
    )
    expect(screen.getByRole("heading", { name: "Move 2 assets" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    fireEvent.click(
      screen.getByRole("button", { name: "Delete selected assets" })
    )
    expect(
      screen.getByRole("heading", { name: "Delete 2 assets?" })
    ).toBeTruthy()
  })

  it("shows the connected Google profile in the account trigger", () => {
    render(
      <LibraryPage
        initialSnapshot={{
          folders: [],
          items: [],
          rootFolderId: "root",
          user: {
            displayName: "Ada Lovelace",
            emailAddress: "ada@example.com",
            photoLink: "https://example.com/ada.jpg",
          },
        }}
      />
    )

    const accountButton = screen.getByRole("button", {
      name: "Open account menu",
    })
    expect(accountButton.textContent).toContain("AL")
  })

  it("switches between All and Folders with the S shortcut", () => {
    render(
      <LibraryPage
        initialSnapshot={{
          folders: [],
          items: [],
          rootFolderId: "root",
        }}
      />
    )

    fireEvent.keyDown(window, { key: "s" })
    expect(
      screen
        .getByRole("radio", { name: "Folders" })
        .getAttribute("aria-checked")
    ).toBe("true")
    expect(screen.getByText("No folders here yet.")).toBeTruthy()

    fireEvent.keyDown(window, { key: "S" })
    expect(
      screen.getByRole("radio", { name: "All" }).getAttribute("aria-checked")
    ).toBe("true")
  })

  it("returns to the parent folder from both library views with ArrowDown", () => {
    const onFolderNavigate = vi.fn()

    render(
      <LibraryPage
        initialSnapshot={{
          folders: [
            { id: "parent", name: "Parent", parentId: null },
            { id: "current", name: "Current", parentId: "parent" },
          ],
          items: [],
          rootFolderId: "root",
        }}
        onFolderNavigate={onFolderNavigate}
        requestedFolderId="current"
      />
    )

    fireEvent.keyDown(window, { key: "ArrowDown" })
    expect(onFolderNavigate).toHaveBeenCalledWith("parent")

    fireEvent.keyDown(window, { key: "s" })
    expect(screen.getByText("No folders here yet.")).toBeTruthy()
    fireEvent.keyDown(window, { key: "ArrowDown" })

    expect(onFolderNavigate).toHaveBeenNthCalledWith(2, "parent")
  })

  it("opens the focused media folder with ArrowUp from the All view", () => {
    const onFolderNavigate = vi.fn()

    render(
      <LibraryPage
        initialSnapshot={{
          folders: [{ id: "references", name: "References", parentId: null }],
          items: [
            {
              capturedAt: "2026-08-15T10:00:00.000Z",
              driveFileId: "drive-item",
              folderId: "references",
              id: "item",
              kind: "image",
              storageMode: "binary",
              sourceLabel: "example.com",
              sourceUrl: "https://example.com/source",
              thumbnailUrl: "/api/media/drive-item",
              title: "Connected reference",
            },
          ],
          rootFolderId: "root",
        }}
        onFolderNavigate={onFolderNavigate}
      />
    )

    const media = screen.getByRole("button", {
      name: "Open Connected reference",
    })
    media.focus()
    fireEvent.keyDown(media, { key: "ArrowUp" })

    expect(onFolderNavigate).toHaveBeenCalledWith("references")
  })

  it("renders connected images as media cards", () => {
    render(
      <LibraryPage
        initialSnapshot={{
          folders: [{ id: "references", name: "References", parentId: null }],
          items: [
            {
              capturedAt: "2026-08-15T10:00:00.000Z",
              driveFileId: "drive-item",
              folderId: "references",
              id: "item",
              kind: "image",
              storageMode: "binary",
              sourceLabel: "example.com",
              sourceUrl: "https://example.com/source",
              thumbnailUrl: "/api/media/drive-item",
              title: "Connected reference",
            },
          ],
          rootFolderId: "root",
        }}
      />
    )

    expect(
      screen.getByRole("button", { name: "Open Connected reference" })
    ).toBeTruthy()
    expect(
      screen.getByRole("img", { name: "Connected reference" })
    ).toBeTruthy()
    expect(screen.queryByText("Connected reference")).toBeNull()
  })

  it("filters the library between images and videos", () => {
    render(
      <LibraryPage
        initialSnapshot={{
          folders: [],
          items: [
            {
              capturedAt: "2026-08-15T10:00:00.000Z",
              driveFileId: "image-file",
              folderId: "root",
              id: "image",
              kind: "image",
              sourceLabel: "example.com",
              sourceUrl: "https://example.com/image",
              storageMode: "binary",
              thumbnailUrl: "/api/media/image-file",
              title: "Image reference",
            },
            {
              capturedAt: "2026-08-15T10:00:00.000Z",
              driveFileId: "video-file",
              folderId: "root",
              id: "video",
              kind: "video",
              sourceLabel: "example.com",
              sourceUrl: "https://example.com/video.mp4",
              storageMode: "binary",
              thumbnailUrl: "/api/media/poster-file",
              title: "Video reference",
            },
          ],
          rootFolderId: "root",
        }}
      />
    )

    fireEvent.click(screen.getByRole("radio", { name: "Videos" }))
    expect(
      screen.getByRole("button", { name: "Open Video reference" })
    ).toBeTruthy()
    expect(
      screen.queryByRole("button", { name: "Open Image reference" })
    ).toBeNull()
    fireEvent.click(
      screen.getByRole("button", { name: "Open Video reference" })
    )
    const video = document.querySelector("video")
    expect(video?.getAttribute("preload")).toBe("metadata")
    expect(video?.getAttribute("src")).toBe("/api/media/video-file")
    fireEvent.click(screen.getByRole("button", { name: "Close" }))

    fireEvent.click(screen.getByRole("radio", { name: "Images" }))
    expect(
      screen.getByRole("button", { name: "Open Image reference" })
    ).toBeTruthy()
    expect(
      screen.queryByRole("button", { name: "Open Video reference" })
    ).toBeNull()

    fireEvent.keyDown(window, { key: "f" })
    expect(
      screen.getByRole("button", { name: "Open Video reference" })
    ).toBeTruthy()
    expect(
      screen.queryByRole("button", { name: "Open Image reference" })
    ).toBeNull()

    fireEvent.keyDown(window, { key: "F" })
    expect(
      screen.getByRole("button", { name: "Open Image reference" })
    ).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Open Video reference" })
    ).toBeTruthy()
  })
})

function createLibraryItem(id: string, title: string, folderId = "root") {
  return {
    capturedAt: "2026-08-23T10:00:00.000Z",
    driveFileId: id,
    folderId,
    id,
    kind: "image" as const,
    sourceLabel: "example.com",
    sourceUrl: `https://example.com/${id}`,
    storageMode: "binary" as const,
    thumbnailUrl: `/api/media/${id}`,
    title,
  }
}
