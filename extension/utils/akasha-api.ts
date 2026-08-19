import type { CaptureDraft } from "@akasha/contracts"

const AUTH_STORAGE_KEY = "akashaDeviceCredential"
const LEGACY_AUTH_STORAGE_KEY = "stillroomGoogleAuth"

export type FolderOption = {
  id: string
  label: string
}

export async function connectAkasha() {
  const redirectUrl = browser.identity.getRedirectURL("oauth2")
  const responseUrl = await browser.identity.launchWebAuthFlow({
    interactive: true,
    url: createAkashaAuthorizationUrl(getAkashaApiUrl(), redirectUrl),
  })

  if (!responseUrl) {
    throw new Error("Akasha authorization was cancelled.")
  }

  const credential = parseAkashaAuthorizationResponse(responseUrl)
  await browser.storage.local.set({ [AUTH_STORAGE_KEY]: credential })
  await browser.storage.local.remove(LEGACY_AUTH_STORAGE_KEY)
  return listFolderOptions()
}

export async function listFolderOptions() {
  const response = await authenticatedRequest("/api/extension/folders")
  const body = (await response.json()) as { folders: FolderOption[] }
  return body.folders
}

export async function saveCapture(
  draft: CaptureDraft,
  folderId: string,
  captureId: string,
  attempt: number
) {
  if (draft.kind === "video") {
    await saveVideoCapture(draft, folderId, captureId, attempt)
    return
  }

  await authenticatedRequest("/api/extension/captures", {
    body: JSON.stringify({ ...draft, attempt, captureId, folderId }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
}

async function saveVideoCapture(
  draft: CaptureDraft,
  folderId: string,
  captureId: string,
  attempt: number
) {
  if (
    draft.storageMode !== "binary" ||
    !["http:", "https:"].includes(new URL(draft.sourceUrl).protocol)
  ) {
    throw new AkashaApiError("This site does not expose a downloadable video.", 422)
  }

  const captureBody = JSON.stringify({ ...draft, attempt, captureId, folderId })

  try {
    await authenticatedRequest("/api/extension/captures", {
      body: captureBody,
      headers: { "Content-Type": "application/json" },
      method: "POST",
    })
    return
  } catch (error) {
    if (!(error instanceof AkashaApiError) || error.status !== 422) throw error
  }

  const sourceResponse = await fetch(draft.sourceUrl, {
    credentials: "omit",
    signal: AbortSignal.timeout(30_000),
  })
  if (!sourceResponse.ok) {
    throw new AkashaApiError("The source video could not be downloaded.", sourceResponse.status)
  }

  const contentLength = Number(sourceResponse.headers.get("Content-Length"))
  if (Number.isFinite(contentLength) && contentLength > 50 * 1024 * 1024) {
    throw new AkashaApiError("This video is too large to save.", 422)
  }

  const media = await sourceResponse.blob()
  if (media.size === 0 || media.size > 50 * 1024 * 1024) {
    throw new AkashaApiError("This video is empty or too large to save.", 422)
  }

  const sourceMimeType = sourceResponse.headers.get("Content-Type")?.split(";")[0]?.trim()
  const mimeType = ["video/mp4", "video/webm"].includes(sourceMimeType ?? "")
    ? sourceMimeType
    : new URL(draft.sourceUrl).pathname.toLowerCase().endsWith(".webm")
      ? "video/webm"
      : "video/mp4"
  const form = new FormData()
  form.set("capture", captureBody)
  form.set(
    "media",
    new Blob([media], { type: mimeType }),
    `capture.${mimeType === "video/webm" ? "webm" : "mp4"}`
  )

  await authenticatedRequest("/api/extension/captures", {
    body: form,
    method: "POST",
  })
}

export function createAkashaAuthorizationUrl(apiUrl: string, redirectUrl: string) {
  const url = new URL("/api/extension/auth", apiUrl)
  url.searchParams.set("redirect_uri", redirectUrl)
  return url.toString()
}

export function parseAkashaAuthorizationResponse(responseUrl: string) {
  const response = new URL(responseUrl)
  const params = new URLSearchParams(response.hash.slice(1))
  const credential = params.get("credential")

  if (params.get("error") || !credential) {
    throw new Error("Akasha authorization was not completed.")
  }

  return credential
}

async function authenticatedRequest(path: string, init?: RequestInit) {
  const credential = await readCredential()

  if (!credential) {
    throw new Error("Connect Akasha to continue.")
  }

  const response = await fetch(new URL(path, getAkashaApiUrl()), {
    ...init,
    headers: {
      Authorization: `Bearer ${credential}`,
      ...init?.headers,
    },
  })
  const rotatedCredential = response.headers.get("X-Akasha-Credential")

  if (rotatedCredential) {
    await browser.storage.local.set({ [AUTH_STORAGE_KEY]: rotatedCredential })
  }

  if (response.status === 401) {
    await browser.storage.local.remove(AUTH_STORAGE_KEY)
    throw new AkashaApiError("Connect Akasha to continue.", 401)
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new AkashaApiError(body?.error ?? "Akasha could not reach your library.", response.status)
  }

  return response
}

export class AkashaApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "AkashaApiError"
  }

  get retryable() {
    return this.status === 408 || this.status === 429 || this.status >= 500
  }
}

async function readCredential() {
  const result = await browser.storage.local.get(AUTH_STORAGE_KEY)
  return result[AUTH_STORAGE_KEY] as string | undefined
}

function getAkashaApiUrl() {
  const configuredUrl = import.meta.env.WXT_AKASHA_API_URL?.trim() || "http://localhost:3000"
  const url = new URL(configuredUrl)

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Akasha API URL must use HTTP or HTTPS.")
  }

  return url.toString()
}
