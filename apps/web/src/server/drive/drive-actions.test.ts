import { beforeEach, describe, expect, it, vi } from "vitest"

import { moveFile } from "./drive.server"

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
}))

vi.mock("googleapis", () => ({
  google: {
    drive: () => ({ files: mocks }),
  },
}))

vi.mock("../auth/google-oauth.server", () => ({
  createGoogleOAuthClient: () => ({ setCredentials: vi.fn() }),
}))

describe("Drive library actions", () => {
  beforeEach(() => {
    mocks.get.mockReset()
    mocks.update.mockReset()
  })

  it("leaves files already in the bulk destination unchanged", async () => {
    mocks.get.mockResolvedValueOnce({
      data: { id: "asset", parents: ["target"] },
    })

    const result = await moveFile("refresh-token", "asset", "target")

    expect(result).toEqual({ id: "asset", parents: ["target"] })
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("moves files that are outside the bulk destination", async () => {
    mocks.get.mockResolvedValueOnce({ data: { parents: ["source"] } })
    mocks.update.mockResolvedValueOnce({
      data: { id: "asset", parents: ["target"] },
    })

    await moveFile("refresh-token", "asset", "target")

    expect(mocks.update).toHaveBeenCalledWith({
      addParents: "target",
      fields: "id,name,mimeType,parents,appProperties,createdTime",
      fileId: "asset",
      removeParents: "source",
    })
  })
})
