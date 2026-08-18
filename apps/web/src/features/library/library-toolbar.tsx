import { MoonIcon, SunIcon, DesktopIcon } from "@phosphor-icons/react"
import { Breadcrumbs } from "@heroui/react"
import { Segment } from "@heroui-pro/react"
import type { LibraryFolder } from "@akasha/contracts"

import type { ThemePreference } from "@/features/theme/theme"
import { LibraryShortcuts } from "./library-shortcuts"

type LibraryToolbarProps = {
  folderPath: LibraryFolder[]
  onThemeChange: (theme: ThemePreference) => void
  theme: ThemePreference
}

export function LibraryToolbar({
  folderPath,
  onThemeChange,
  theme,
}: LibraryToolbarProps) {
  return (
    <header className="library-header">
      <div className="library-header__crumbs">
        <Breadcrumbs aria-label="Current folder">
          <Breadcrumbs.Item href="/">Akasha</Breadcrumbs.Item>
          {folderPath.map((folder) => (
            <Breadcrumbs.Item href={`/?folder=${folder.id}`} key={folder.id}>
              {folder.name}
            </Breadcrumbs.Item>
          ))}
        </Breadcrumbs>
      </div>
      <div className="library-header__controls">
        <LibraryShortcuts />
        <Segment
          aria-label="Theme"
          selectedKey={theme}
          size="sm"
          onSelectionChange={(key) => onThemeChange(key as ThemePreference)}
        >
          <Segment.Item aria-label="Light theme" id="light">
            <SunIcon aria-hidden="true" size={16} />
          </Segment.Item>
          <Segment.Item aria-label="Dark theme" id="dark">
            <MoonIcon aria-hidden="true" size={16} />
          </Segment.Item>
          <Segment.Item aria-label="System theme" id="system">
            <DesktopIcon aria-hidden="true" size={16} />
          </Segment.Item>
        </Segment>
      </div>
    </header>
  )
}
