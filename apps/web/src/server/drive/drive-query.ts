export function escapeDriveQueryValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")
}
