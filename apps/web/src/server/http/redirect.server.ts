export function createRedirectResponse(
  location: string | URL,
  status: 302 | 303 = 302
) {
  return new Response(null, {
    headers: { Location: location.toString() },
    status,
  })
}
