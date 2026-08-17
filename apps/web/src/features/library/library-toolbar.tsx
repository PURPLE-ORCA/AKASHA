import {
  GridFourIcon,
  ListBulletsIcon,
  MoonIcon,
  SunIcon,
  DesktopIcon,
} from "@phosphor-icons/react"
import { Breadcrumbs } from "@heroui/react"
import { Segment } from "@heroui-pro/react"
import type { LibraryFolder } from "@stillroom/contracts"

export type GalleryLayout = "cards" | "list"
export type ThemePreference = "light" | "dark" | "system"

type LibraryToolbarProps = {
  folderPath: LibraryFolder[]
  layout: GalleryLayout
  onLayoutChange: (layout: GalleryLayout) => void
  onThemeChange: (theme: ThemePreference) => void
  theme: ThemePreference
}

export function LibraryToolbar({
  folderPath,
  layout,
  onLayoutChange,
  onThemeChange,
  theme,
}: LibraryToolbarProps) {
  return (
    <header className="library-header">
      <div className="library-header__crumbs">
        <Breadcrumbs aria-label="Current folder">
          <Breadcrumbs.Item href="/">Stillroom</Breadcrumbs.Item>
          {folderPath.map((folder) => (
            <Breadcrumbs.Item href={`/?folder=${folder.id}`} key={folder.id}>
              {folder.name}
            </Breadcrumbs.Item>
          ))}
        </Breadcrumbs>
      </div>
      <div className="library-header__controls">
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
        <Segment
          aria-label="Gallery layout"
          selectedKey={layout}
          size="sm"
          onSelectionChange={(key) => onLayoutChange(key as GalleryLayout)}
        >
          <Segment.Item aria-label="Cards view" id="cards">
            <GridFourIcon aria-hidden="true" size={16} weight="fill" />
          </Segment.Item>
          <Segment.Item aria-label="List view" id="list">
            <ListBulletsIcon aria-hidden="true" size={16} />
          </Segment.Item>
        </Segment>
      </div>
    </header>
  )
}
