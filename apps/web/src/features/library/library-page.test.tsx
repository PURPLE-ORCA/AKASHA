// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { LibraryPage } from "./library-page"

afterEach(cleanup)

describe("LibraryPage", () => {
  it("shows an empty library with a first-folder action", () => {
    render(
      <LibraryPage
        initialSnapshot={{ folders: [], items: [], rootFolderId: "root" }}
      />
    )

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Akasha"
    )
    expect(screen.getByRole("tab", { name: "All" })).toBeTruthy()
    expect(screen.getByRole("tab", { name: "Folders" })).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Keyboard shortcuts" })
    ).toBeTruthy()
    expect(screen.getByRole("button", { name: "Create folder" })).toBeTruthy()
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("renders connected media as image-only cards", () => {
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
})
