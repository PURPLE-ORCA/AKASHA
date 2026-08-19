import { describe, expect, it } from "vitest"

import { createCaptureResultNotification } from "./capture-result"

describe("capture result notifications", () => {
  it("confirms a newly saved capture", () => {
    expect(createCaptureResultNotification("saved", "Reference")).toEqual({
      message: "Reference is now in your library.",
      title: "Saved to Akasha",
    })
  })

  it("explains that an existing capture was not copied", () => {
    expect(createCaptureResultNotification("already_saved", "Reference")).toEqual({
      message: "Reference was saved before, so no copy was added.",
      title: "Already in Akasha",
    })
  })
})
