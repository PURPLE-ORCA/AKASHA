// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { LibraryFolder, LibraryItem } from "@akasha/contracts"

import { FolderGallery, getFolderPreviews } from "./folder-tree"

vi.mock("@tanstack/react-router", async () => {
  const { forwardRef } = await import("react")

  return {
    Link: forwardRef<
      HTMLAnchorElement,
      React.ComponentProps<"a"> & { search?: unknown; to?: string }
    >(function TestLink({ search: _search, to = "/", ...props }, ref) {
      return <a {...props} href={to} ref={ref} />
    }),
  }
})

afterEach(cleanup)

const folders: LibraryFolder[] = [
  { id: "parent", name: "Parent", parentId: null },
  { id: "child", name: "Child", parentId: "parent" },
]

function createItem(
  id: string,
  folderId: string,
  kind: LibraryItem["kind"] = "image"
): LibraryItem {
  return {
    capturedAt: "2026-08-18T10:00:00.000Z",
    driveFileId: `drive-${id}`,
    folderId,
    id,
    kind,
    storageMode: "binary",
    sourceLabel: "example.com",
    sourceUrl: `https://example.com/${id}`,
    thumbnailUrl: `/api/media/drive-${id}`,
    title: id,
  }
}

describe("getFolderPreviews", () => {
  it("collects at most three media previews from a folder and its descendants", () => {
    const previews = getFolderPreviews(folders, [
      createItem("parent-image", "parent"),
      createItem("child-image-one", "child"),
      createItem("child-video", "child", "video"),
      createItem("child-image-two", "child"),
      createItem("child-image-three", "child"),
    ])

    expect(previews.get("parent")?.map((item) => item.id)).toEqual([
      "parent-image",
      "child-image-one",
      "child-video",
    ])
  })

  it("does not use images without thumbnails", () => {
    const item = createItem("image", "parent")
    delete item.thumbnailUrl

    expect(getFolderPreviews(folders, [item]).get("parent")).toEqual([])
  })
})

describe("FolderGallery", () => {
  it("moves across and enters the folder tree with arrow keys", () => {
    const onMoveFolder = vi.fn()
    const onRemoveFolder = vi.fn()
    const onRenameFolder = vi.fn()

    render(
      <FolderGallery
        folders={folders}
        items={[]}
        libraryFolders={folders}
        onMoveFolder={onMoveFolder}
        onRemoveFolder={onRemoveFolder}
        onRenameFolder={onRenameFolder}
      />
    )
    const parent = screen.getByRole("link", { name: "Parent" })
    const child = screen.getByRole("link", { name: "Child" })

    parent.focus()
    fireEvent.keyDown(parent, { key: "ArrowRight" })
    expect(document.activeElement).toBe(child)

    fireEvent.keyDown(child, { key: "ArrowLeft" })
    expect(document.activeElement).toBe(parent)

    const click = vi.spyOn(parent, "click")
    fireEvent.keyDown(parent, { key: "ArrowUp" })
    expect(click).toHaveBeenCalledOnce()

    fireEvent.keyDown(parent, { key: " " })
    expect(click).toHaveBeenCalledTimes(2)

    fireEvent.contextMenu(parent)
    fireEvent.click(screen.getByText("Rename"))
    expect(onRenameFolder).toHaveBeenCalledWith(folders[0])
  })
})
