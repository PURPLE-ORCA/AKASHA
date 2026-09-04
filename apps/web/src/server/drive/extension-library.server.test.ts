import { describe, expect, it } from "vitest"

import {
  buildExtensionFolderOptions,
  buildReachableFolders,
} from "./extension-library.server"

describe("buildExtensionFolderOptions", () => {
  it("preserves nested folder depth beneath the Akasha root", () => {
    expect(
      buildExtensionFolderOptions({
        folders: [
          { id: "child", name: "Editorial", parentId: "parent" },
          { id: "parent", name: "Design", parentId: null },
        ],
        rootFolderId: "root",
      })
    ).toEqual([
      { depth: 0, id: "root", label: "Akasha" },
      { depth: 1, id: "parent", label: "Design" },
      { depth: 2, id: "child", label: "Editorial" },
    ])
  })
})

describe("buildReachableFolders", () => {
  it("keeps only the nested folder graph beneath the Akasha root", () => {
    expect(
      buildReachableFolders("root", [
        { id: "parent", name: "Design", parents: ["root"] },
        { id: "child", name: "Editorial", parents: ["parent"] },
        { id: "outside", name: "Outside", parents: ["another-root"] },
      ])
    ).toEqual([
      { id: "parent", name: "Design", parentId: null },
      { id: "child", name: "Editorial", parentId: "parent" },
    ])
  })
})
