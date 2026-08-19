import { createHash } from "node:crypto"
import { Transform } from "node:stream"

import { escapeDriveQueryValue } from "./drive-query"

export const SOURCE_HASH_PROPERTY = "akashaSourceHashV1"
export const CONTENT_HASH_PROPERTY = "akashaContentHashV1"

export function createSourceFingerprint(sourceUrl: string) {
  const normalizedUrl = new URL(sourceUrl)
  normalizedUrl.hash = ""

  return createHash("sha256")
    .update(`akasha-source-v1\0${normalizedUrl.toString()}`)
    .digest("hex")
}

export function createContentHashTransform() {
  const hash = createHash("sha256")
  let digest: string | undefined

  const stream = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hash.update(chunk)
      callback(null, chunk)
    },
    flush(callback) {
      digest = hash.digest("hex")
      callback()
    },
  })

  return {
    digest() {
      if (!digest) {
        throw new Error("Akasha could not finish the capture fingerprint.")
      }

      return digest
    },
    stream,
  }
}

export function buildCapturePropertyQuery(property: string, value: string) {
  return [
    `appProperties has { key='${escapeDriveQueryValue(property)}' and value='${escapeDriveQueryValue(value)}' }`,
    "appProperties has { key='stillroomType' and value='item' }",
    "trashed = false",
  ].join(" and ")
}

export function createBackfillProperties(file: {
  appProperties?: Record<string, string> | null
  description?: string | null
  mimeType?: string | null
  sha256Checksum?: string | null
}) {
  const properties = { ...file.appProperties }
  const sourceUrl = readCaptureSourceUrl(file.description)

  if (sourceUrl && !properties[SOURCE_HASH_PROPERTY]) {
    properties[SOURCE_HASH_PROPERTY] = createSourceFingerprint(sourceUrl)
  }

  if (
    (file.mimeType?.startsWith("image/") ||
      file.mimeType?.startsWith("video/")) &&
    file.sha256Checksum &&
    !properties[CONTENT_HASH_PROPERTY]
  ) {
    properties[CONTENT_HASH_PROPERTY] = file.sha256Checksum.toLowerCase()
  }

  return properties
}

function readCaptureSourceUrl(description?: string | null) {
  if (!description) return undefined

  try {
    const sourceUrl = (JSON.parse(description) as { sourceUrl?: unknown })
      .sourceUrl
    if (typeof sourceUrl !== "string") return undefined
    return new URL(sourceUrl).toString()
  } catch {
    return undefined
  }
}
