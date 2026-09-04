import { describe, expect, it } from "vitest"

import { isFolderCacheFresh } from "./folder-cache"

describe("isFolderCacheFresh", () => {
  it("keeps recent folders and refreshes stale folders", () => {
    expect(isFolderCacheFresh(900, 1_000, 101)).toBe(true)
    expect(isFolderCacheFresh(899, 1_000, 101)).toBe(false)
  })
})
