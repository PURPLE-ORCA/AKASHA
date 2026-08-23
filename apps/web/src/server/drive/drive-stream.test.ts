import { Readable } from "node:stream"
import { describe, expect, it } from "vitest"

import {
  createImageValidationTransform,
  createSizeLimitTransform,
  createVideoValidationTransform,
  fetchSafeRemoteSource,
  isPrivateIpAddress,
  normalizeLibraryUploadFileName,
} from "./drive.server"

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

  it("accepts matching image signatures and rejects spoofed types", async () => {
    const pngBytes = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(24),
    ])
    const valid = Readable.from([pngBytes]).pipe(
      createImageValidationTransform("image/png", 100)
    )
    const spoofed = Readable.from([pngBytes]).pipe(
      createImageValidationTransform("image/jpeg", 100)
    )
    spoofed.on("error", () => undefined)

    await expect(readStream(valid)).resolves.toEqual(pngBytes)
    await expect(readStream(spoofed)).rejects.toThrow("not supported")
  })

  it("normalizes local filenames while preserving a matching extension", () => {
    expect(
      normalizeLibraryUploadFileName("Campaign / Hero.PNG", "image/png")
    ).toBe("Campaign - Hero.png")
    expect(normalizeLibraryUploadFileName("\u0000", "image/webp")).toBe(
      "upload.webp"
    )
  })

  it("accepts streamed MP4 and WebM signatures", async () => {
    const mp4 = Readable.from([
      Buffer.from([
        0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
      ]),
    ]).pipe(createVideoValidationTransform("video/mp4", 100))
    const webm = Readable.from([
      Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0]),
    ]).pipe(createVideoValidationTransform("video/webm", 100))

    await expect(readStream(mp4)).resolves.toHaveLength(12)
    await expect(readStream(webm)).resolves.toHaveLength(12)
  })

  it("rejects spoofed and oversized videos while streaming", async () => {
    const spoofed = Readable.from([Buffer.alloc(12)]).pipe(
      createVideoValidationTransform("video/mp4", 100)
    )
    await expect(readStream(spoofed)).rejects.toThrow("not supported")

    const oversized = Readable.from([
      Buffer.from([
        0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
      ]),
      Buffer.alloc(10),
    ]).pipe(createVideoValidationTransform("video/mp4", 20))
    await expect(readStream(oversized)).rejects.toThrow("too large")
  })
})

describe("safe remote media fetch", () => {
  it("rejects private and reserved addresses", () => {
    expect(isPrivateIpAddress("127.0.0.1")).toBe(true)
    expect(isPrivateIpAddress("169.254.1.1")).toBe(true)
    expect(isPrivateIpAddress("100.64.0.1")).toBe(true)
    expect(isPrivateIpAddress("::1")).toBe(true)
    expect(isPrivateIpAddress("[::1]")).toBe(true)
    expect(isPrivateIpAddress("::ffff:127.0.0.1")).toBe(true)
    expect(isPrivateIpAddress("8.8.8.8")).toBe(false)
  })

  it("validates every redirect target before following it", async () => {
    const requestedUrls: string[] = []
    const fetcher = async (input: URL | RequestInfo) => {
      const url = input.toString()
      requestedUrls.push(url)
      return new Response(null, {
        headers: { Location: "http://127.0.0.1/private.mp4" },
        status: 302,
      })
    }

    await expect(
      fetchSafeRemoteSource(
        "https://cdn.example.com/video.mp4",
        {},
        {
          fetcher,
          resolveAddresses: async () => ["8.8.8.8"],
        }
      )
    ).rejects.toThrow("private addresses")
    expect(requestedUrls).toEqual(["https://cdn.example.com/video.mp4"])
  })
})

async function readStream(stream: Readable) {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}
