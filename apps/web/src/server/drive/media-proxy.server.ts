const FORWARDED_REQUEST_HEADERS = [
  "If-None-Match",
  "If-Range",
  "Range",
] as const
const FORWARDED_RESPONSE_HEADERS = [
  "Accept-Ranges",
  "Content-Length",
  "Content-Range",
  "ETag",
  "Last-Modified",
] as const

export function createDriveMediaRequestHeaders(
  requestHeaders: Headers,
  accessToken: string
) {
  const headers = new Headers({ Authorization: `Bearer ${accessToken}` })

  for (const name of FORWARDED_REQUEST_HEADERS) {
    copyHeader(requestHeaders, headers, name)
  }

  return headers
}

export function createMediaProxyResponse(driveResponse: Response) {
  const responseHeaders = new Headers({
    "Cache-Control": "private, max-age=300, stale-while-revalidate=3600",
    "Content-Type":
      driveResponse.headers.get("Content-Type") ?? "application/octet-stream",
    Vary: "Cookie, Authorization, Range",
    "X-Content-Type-Options": "nosniff",
  })

  for (const name of FORWARDED_RESPONSE_HEADERS) {
    copyHeader(driveResponse.headers, responseHeaders, name)
  }

  const body = [204, 304].includes(driveResponse.status)
    ? null
    : driveResponse.body

  return new Response(body, {
    headers: responseHeaders,
    status: driveResponse.status,
    statusText: driveResponse.statusText,
  })
}

function copyHeader(source: Headers, destination: Headers, name: string) {
  const value = source.get(name)
  if (value) destination.set(name, value)
}
