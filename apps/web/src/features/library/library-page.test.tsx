// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TooltipProvider } from "@/components/ui/tooltip"
import { LibraryPage } from "./library-page"

describe("LibraryPage", () => {
  it("renders the selected folder and its saved items", () => {
    render(
      <TooltipProvider>
        <LibraryPage />
      </TooltipProvider>
    )

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Bento sections"
    )
    expect(
      screen.getByRole("searchbox", { name: "Search your library" })
    ).toBeTruthy()
    expect(screen.getByText("8 items")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Connect library" })).toBeTruthy()
  })
})
