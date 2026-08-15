import { describe, expect, it } from "vitest"

import type { LibraryFolder } from "./library"
import { buildFolderTree, getFolderPath } from "./folders"

const folders: LibraryFolder[] = [
  { id: "design", name: "Design aspirations", parentId: null },
  { id: "landing", name: "Landing pages", parentId: "design" },
  { id: "bento", name: "Bento sections", parentId: "landing" },
  { id: "motion", name: "Motion", parentId: null },
]

describe("buildFolderTree", () => {
  it("preserves nested folder relationships", () => {
    const tree = buildFolderTree(folders)

    expect(tree).toHaveLength(2)
    expect(tree[0]?.children[0]?.children[0]?.name).toBe("Bento sections")
  })

  it("keeps folders with a missing parent accessible at the root", () => {
    const tree = buildFolderTree([
      ...folders,
      { id: "orphan", name: "Recovered", parentId: "missing" },
    ])

    expect(tree.map((folder) => folder.id)).toContain("orphan")
  })
})

describe("getFolderPath", () => {
  it("returns a root-to-leaf breadcrumb", () => {
    expect(getFolderPath(folders, "bento").map((folder) => folder.name)).toEqual([
      "Design aspirations",
      "Landing pages",
      "Bento sections",
    ])
  })

  it("stops safely when folders contain a cycle", () => {
    const cyclicFolders: LibraryFolder[] = [
      { id: "one", name: "One", parentId: "two" },
      { id: "two", name: "Two", parentId: "one" },
    ]

    expect(getFolderPath(cyclicFolders, "one")).toHaveLength(2)
  })
})
