import { describe, expect, it } from "vitest"

import { escapeDriveQueryValue } from "./drive-query"

describe("escapeDriveQueryValue", () => {
  it("escapes apostrophes and backslashes", () => {
    expect(escapeDriveQueryValue("folder\\'one")).toBe("folder\\\\\\'one")
  })
})
