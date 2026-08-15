export function buildFolderChildrenQuery(folderId: string) {
  return `'${escapeDriveQueryValue(folderId)}' in parents and trashed = false`
}

export function escapeDriveQueryValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")
}
