import { createHmac, timingSafeEqual } from "node:crypto"

const TOKEN_VERSION = 1
const TOKEN_BUCKET_MS = 24 * 60 * 60 * 1000
const MAX_REDIRECTS = 5

type DriveThumbnailTokenPayload = {
  expiresAt: number
  fileId: string
  thumbnailUrl: string
  version: typeof TOKEN_VERSION
}

type CreateDriveThumbnailTokenOptions = {
  now?: number
  secret: string
}

export function createDriveThumbnailToken(
  fileId: string,
  thumbnailUrl: string,
  { now = Date.now(), secret }: CreateDriveThumbnailTokenOptions
) {
  assertGoogleThumbnailUrl(thumbnailUrl)

  const payload: DriveThumbnailTokenPayload = {
    expiresAt: (Math.floor(now / TOKEN_BUCKET_MS) + 2) * TOKEN_BUCKET_MS,
    fileId,
    thumbnailUrl,
    version: TOKEN_VERSION,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  )

  return `${encodedPayload}.${sign(encodedPayload, secret)}`
}

export function createDriveThumbnailUrl(
  fileId: string,
  thumbnailUrl: string,
  options: CreateDriveThumbnailTokenOptions
) {
  const token = createDriveThumbnailToken(fileId, thumbnailUrl, options)
  return `/api/media/${encodeURIComponent(fileId)}?preview=${encodeURIComponent(token)}`
}

export function verifyDriveThumbnailToken(
  token: string,
  { now = Date.now(), secret }: CreateDriveThumbnailTokenOptions
) {
  const [encodedPayload, signature, ...remainder] = token.split(".")

  if (!encodedPayload || !signature || remainder.length > 0) {
    throw new Error("Invalid thumbnail token.")
  }

  const expectedSignature = sign(encodedPayload, secret)
  const signatureBytes = Buffer.from(signature, "base64url")
  const expectedBytes = Buffer.from(expectedSignature, "base64url")

  if (
    signatureBytes.length !== expectedBytes.length ||
    !timingSafeEqual(signatureBytes, expectedBytes)
  ) {
    throw new Error("Invalid thumbnail token.")
  }

  const payload = JSON.parse(
    Buffer.from(encodedPayload, "base64url").toString("utf8")
  ) as Partial<DriveThumbnailTokenPayload>

  if (
    payload.version !== TOKEN_VERSION ||
    typeof payload.fileId !== "string" ||
    typeof payload.thumbnailUrl !== "string" ||
    typeof payload.expiresAt !== "number" ||
    payload.expiresAt <= now
  ) {
    throw new Error("Expired or invalid thumbnail token.")
  }

  assertGoogleThumbnailUrl(payload.thumbnailUrl)

  return payload as DriveThumbnailTokenPayload
}

export async function fetchDriveThumbnail(
  thumbnailUrl: string,
  accessToken: string,
  requestHeaders = new Headers(),
  fetcher: typeof fetch = fetch
) {
  let currentUrl = thumbnailUrl

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    assertGoogleThumbnailUrl(currentUrl)

    const headers = new Headers({ Authorization: `Bearer ${accessToken}` })
    const etag = requestHeaders.get("If-None-Match")
    if (etag) headers.set("If-None-Match", etag)

    const response = await fetcher(currentUrl, {
      headers,
      redirect: "manual",
    })

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response
    }

    const location = response.headers.get("Location")
    if (!location || redirectCount === MAX_REDIRECTS) {
      throw new Error("Thumbnail redirect could not be followed.")
    }

    currentUrl = new URL(location, currentUrl).toString()
  }

  throw new Error("Thumbnail redirect could not be followed.")
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

function assertGoogleThumbnailUrl(value: string) {
  const url = new URL(value)
  const hostname = url.hostname.toLowerCase()
  const isGoogleHost = [
    "google.com",
    "googleapis.com",
    "googleusercontent.com",
  ].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))

  if (url.protocol !== "https:" || !isGoogleHost) {
    throw new Error("Invalid thumbnail URL.")
  }
}
