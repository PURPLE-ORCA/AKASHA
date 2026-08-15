// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { TooltipProvider } from "@/components/ui/tooltip"
import { LibraryPage } from "./library-page"

afterEach(cleanup)

describe("LibraryPage", () => {
  it("shows a real empty library with a first-folder action", () => {
    render(
      <TooltipProvider>
        <LibraryPage
          initialSnapshot={{ folders: [], items: [], rootFolderId: "root" }}
        />
      </TooltipProvider>
    )

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Stillroom"
    )
    expect(screen.getByText("0 items")).toBeTruthy()
    expect(
      screen.getByRole("button", { name: "Create your first folder" })
    ).toBeTruthy()
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("renders only items returned by the connected library", () => {
    render(
      <TooltipProvider>
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
                title: "Connected reference",
              },
            ],
            rootFolderId: "root",
          }}
        />
      </TooltipProvider>
    )

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "References"
    )
    expect(screen.getByText("Connected reference")).toBeTruthy()
    expect(screen.queryByText("Architectural navigation study")).toBeNull()
  })
})
