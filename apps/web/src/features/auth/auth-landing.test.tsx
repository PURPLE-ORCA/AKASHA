// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { AuthLanding } from "./auth-landing"

afterEach(cleanup)

describe("AuthLanding", () => {
  it("offers one clear Google authentication action", () => {
    render(<AuthLanding />)

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Keep the ideas worth returning to.",
      })
    ).toBeTruthy()
    expect(
      screen
        .getByRole("button", { name: "Continue with Google" })
        .getAttribute("href")
    ).toBe("/api/auth/google")
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("shows an actionable connection error", () => {
    render(<AuthLanding connectionFailed />)

    expect(screen.getByRole("alert").textContent).toContain("couldn’t connect")
  })
})
