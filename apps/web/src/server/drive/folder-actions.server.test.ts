import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  moveDriveFolder,
  renameDriveFolder,
  trashDriveFolder,
} from "./folder-actions.server"

const mocks = vi.hoisted(() => ({
  moveFile: vi.fn(),
  trashFile: vi.fn(),
  update: vi.fn(),
}))

vi.mock("./drive.server", () => ({
  createDriveClient: () => ({ files: { update: mocks.update } }),
  listStillroomFolders: vi.fn().mockResolvedValue({
    folders: [
      {
        id: "root",
        name: "Akasha",
        appProperties: { stillroomRoot: "1" },
      },
      { id: "parent", name: "Parent", parents: ["root"] },
      { id: "child", name: "Child", parents: ["parent"] },
      { id: "target", name: "Target", parents: ["root"] },
    ],
    root: { id: "root", name: "Akasha" },
  }),
  moveFile: mocks.moveFile,
  trashFile: mocks.trashFile,
}))

describe("folder actions", () => {
  beforeEach(() => {
    mocks.moveFile.mockReset()
    mocks.trashFile.mockReset()
    mocks.update.mockReset()
  })

  it("renames, moves, and trashes managed folders while rejecting cycles", async () => {
    mocks.update.mockResolvedValueOnce({ data: { id: "parent", name: "Renamed" } })
    mocks.moveFile.mockResolvedValueOnce({ id: "parent", parents: ["target"] })
    mocks.trashFile.mockResolvedValueOnce({ id: "parent", trashed: true })

    await renameDriveFolder("refresh-token", "parent", "Renamed")
    await moveDriveFolder("refresh-token", "parent", "target")
    await trashDriveFolder("refresh-token", "parent")

    expect(mocks.update).toHaveBeenCalledWith({
      fields: "id,name,mimeType,parents,appProperties,createdTime",
      fileId: "parent",
      requestBody: { name: "Renamed" },
    })
    expect(mocks.moveFile).toHaveBeenCalledWith(
      "refresh-token",
      "parent",
      "target"
    )
    expect(mocks.trashFile).toHaveBeenCalledWith("refresh-token", "parent")
    await expect(
      moveDriveFolder("refresh-token", "parent", "child")
    ).rejects.toThrow("A folder cannot be moved inside itself.")
  })
})
