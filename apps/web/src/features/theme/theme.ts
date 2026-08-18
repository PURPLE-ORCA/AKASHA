export type ThemePreference = "light" | "dark" | "system"

export const themeBootstrapScript = `(() => {
  try {
    const saved = localStorage.getItem("stillroom-theme");
    const preference = saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
    const resolved = preference === "system"
      ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : preference;
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
  } catch {}
})();`

export function isThemePreference(
  value: string | null
): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system"
}

export function resolveTheme(theme: ThemePreference) {
  if (theme !== "system") return theme
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

export function applyTheme(theme: ThemePreference, systemIsDark: boolean) {
  const resolved =
    theme === "system" ? (systemIsDark ? "dark" : "light") : theme
  const root = document.documentElement
  root.classList.toggle("dark", resolved === "dark")
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
}
