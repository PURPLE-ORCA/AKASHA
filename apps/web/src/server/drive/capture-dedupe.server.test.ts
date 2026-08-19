import { Readable } from "node:stream"
import { describe, expect, it } from "vitest"

import {
  buildCapturePropertyQuery,
  CONTENT_HASH_PROPERTY,
  createBackfillProperties,
  createContentHashTransform,
  createSourceFingerprint,
  SOURCE_HASH_PROPERTY,
} from "./capture-dedupe.server"

describe("capture duplicate fingerprints", () => {
  it("ignores URL fragments without collapsing meaningful query variants", () => {
    expect(
      createSourceFingerprint("https://EXAMPLE.com/image.jpg#preview")
    ).toBe(createSourceFingerprint("https://example.com/image.jpg"))
    expect(
      createSourceFingerprint("https://example.com/image.jpg?w=800")
    ).not.toBe(createSourceFingerprint("https://example.com/image.jpg?w=1200"))
  })

  it("hashes content without delaying the first streamed chunk", async () => {
    let releaseSecondChunk: () => void = () => undefined
    const waitForRelease = new Promise<void>((resolve) => {
      releaseSecondChunk = resolve
    })
    const source = Readable.from(
      (async function* () {
        yield Buffer.from("first")
        await waitForRelease
        yield Buffer.from("second")
      })()
    )
    const contentHash = createContentHashTransform()
    const chunks = source.pipe(contentHash.stream)[Symbol.asyncIterator]()

    const firstChunk = await chunks.next()
    expect(Buffer.from(firstChunk.value).toString()).toBe("first")

    releaseSecondChunk()
    const secondChunk = await chunks.next()
    expect(Buffer.from(secondChunk.value).toString()).toBe("second")
    await chunks.next()
    expect(contentHash.digest()).toBe(
      "da83f63e1a473003712c18f5afc5a79044221943d1083c7c5a7ac7236d85e8d2"
    )
  })

  it("creates a scoped exact-property Drive query", () => {
    expect(buildCapturePropertyQuery("hash", "value")).toBe(
      "appProperties has { key='hash' and value='value' } and appProperties has { key='stillroomType' and value='item' } and trashed = false"
    )
  })

  it("backfills source and binary-content hashes while preserving metadata", () => {
    expect(
      createBackfillProperties({
        appProperties: { stillroomKind: "image", stillroomType: "item" },
        description: JSON.stringify({
          sourceUrl: "https://example.com/image.jpg",
        }),
        mimeType: "image/jpeg",
        sha256Checksum: "ABC123",
      })
    ).toEqual({
      [CONTENT_HASH_PROPERTY]: "abc123",
      [SOURCE_HASH_PROPERTY]: createSourceFingerprint(
        "https://example.com/image.jpg"
      ),
      stillroomKind: "image",
      stillroomType: "item",
    })
  })

  it("does not treat a reference descriptor checksum as video content", () => {
    const properties = createBackfillProperties({
      appProperties: { stillroomKind: "video", stillroomType: "item" },
      description: JSON.stringify({
        sourceUrl: "https://example.com/stream.m3u8",
      }),
      mimeType: "application/json",
      sha256Checksum: "descriptor-hash",
    })

    expect(properties[SOURCE_HASH_PROPERTY]).toBeDefined()
    expect(properties[CONTENT_HASH_PROPERTY]).toBeUndefined()
  })
})
