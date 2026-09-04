const FOLDER_CACHE_TTL_MS = 5 * 60 * 1000

export function isFolderCacheFresh(
  cachedAt: number,
  now = Date.now(),
  ttlMs = FOLDER_CACHE_TTL_MS
) {
  return now - cachedAt < ttlMs
}
