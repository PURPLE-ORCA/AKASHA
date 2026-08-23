import { describe, expect, it } from "vitest"

import { isLibraryUploadDestination } from "./library-upload.server"

describe("isLibraryUploadDestination", () => {
  const folders = [
    { id: "parent", name: "Design", parents: ["root"] },
    { id: "child", name: "Editorial", parents: ["parent"] },
    { id: "outside", name: "Outside", parents: ["another-root"] },
  ]

  it("accepts the Akasha root and every reachable child", () => {
    expect(isLibraryUploadDestination("root", folders, "root")).toBe(true)
    expect(isLibraryUploadDestination("root", folders, "parent")).toBe(true)
    expect(isLibraryUploadDestination("root", folders, "child")).toBe(true)
  })

  it("rejects folders outside the Akasha tree", () => {
    expect(isLibraryUploadDestination("root", folders, "outside")).toBe(false)
    expect(isLibraryUploadDestination("root", folders, "missing")).toBe(false)
  })
})
