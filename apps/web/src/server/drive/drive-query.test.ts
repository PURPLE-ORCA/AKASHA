import { describe, expect, it } from "vitest"

import { buildFolderChildrenQuery, escapeDriveQueryValue } from "./drive-query"

describe("escapeDriveQueryValue", () => {
  it("escapes apostrophes and backslashes", () => {
    expect(escapeDriveQueryValue("folder\\'one")).toBe("folder\\\\\\'one")
  })
})

describe("buildFolderChildrenQuery", () => {
  it("limits results to active children of one folder", () => {
    expect(buildFolderChildrenQuery("folder-id")).toBe(
      "'folder-id' in parents and trashed = false"
    )
  })
})
