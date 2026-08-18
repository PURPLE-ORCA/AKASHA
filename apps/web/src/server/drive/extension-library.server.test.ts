import { describe, expect, it } from "vitest"

import { buildExtensionFolderOptions } from "./extension-library.server"

describe("buildExtensionFolderOptions", () => {
  it("flattens nested folders beneath the Akasha root", () => {
    expect(
      buildExtensionFolderOptions({
        folders: [
          { id: "child", name: "Editorial", parentId: "parent" },
          { id: "parent", name: "Design", parentId: null },
        ],
        rootFolderId: "root",
      })
    ).toEqual([
      { id: "root", label: "Akasha" },
      { id: "parent", label: "— Design" },
      { id: "child", label: "— — Editorial" },
    ])
  })
})
