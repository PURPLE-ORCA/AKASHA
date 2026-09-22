import { beforeEach, describe, expect, it, vi } from "vitest"
import type { drive_v3 } from "googleapis"

import { listStillroomLibrary } from "./drive.server"

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
}))

describe("Drive library listing", () => {
  beforeEach(() => {
    mocks.create.mockReset()
    mocks.list.mockReset()
  })

  it("finds the Akasha root in the same file listing", async () => {
    const root = {
      appProperties: { stillroomRole: "root" },
      id: "root",
      mimeType: "application/vnd.google-apps.folder",
      name: "Akasha",
    }
    mocks.list.mockResolvedValueOnce({
      data: { files: [root, { id: "asset", name: "Asset" }] },
    })

    const result = await listStillroomLibrary({
      files: mocks,
    } as unknown as drive_v3.Drive)

    expect(result).toEqual({
      files: [root, { id: "asset", name: "Asset" }],
      root,
    })
    expect(mocks.list).toHaveBeenCalledTimes(1)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
