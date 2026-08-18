import { Readable } from "node:stream"
import { describe, expect, it } from "vitest"

import { createSizeLimitTransform } from "./drive.server"

describe("capture upload stream", () => {
  it("passes chunks through without waiting for the complete image", async () => {
    let releaseSecondChunk: () => void = () => undefined
    const waitForRelease = new Promise<void>((resolve) => {
      releaseSecondChunk = resolve
    })
    const source = async function* () {
      yield Buffer.from("first")
      await waitForRelease
      yield Buffer.from("second")
    }
    const stream = Readable.from(source()).pipe(createSizeLimitTransform(20))
    const chunks = stream[Symbol.asyncIterator]()

    const firstChunk = await chunks.next()
    expect(Buffer.from(firstChunk.value).toString()).toBe("first")

    releaseSecondChunk()
    const secondChunk = await chunks.next()
    expect(Buffer.from(secondChunk.value).toString()).toBe("second")
  })

  it("rejects an image as soon as streamed bytes exceed the limit", async () => {
    const stream = Readable.from([Buffer.alloc(4), Buffer.alloc(4)]).pipe(
      createSizeLimitTransform(6)
    )

    await expect(async () => {
      for await (const _chunk of stream) void _chunk
    }).rejects.toThrow("too large")
  })
})
