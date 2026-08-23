import {
  DesktopIcon,
  MoonIcon,
  SelectionPlusIcon,
  SelectionSlashIcon,
  SunIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react"
import { Breadcrumbs, Button, ToggleButton, Tooltip } from "@heroui/react"
import { Segment } from "@heroui-pro/react"
import type { LibraryFolder } from "@akasha/contracts"

import type { ThemePreference } from "@/features/theme/theme"
import { LibraryShortcuts } from "./library-shortcuts"

type LibraryToolbarProps = {
  activeView: "all" | "folders"
  canSelect: boolean
  folderPath: LibraryFolder[]
  isSelectionMode: boolean
  mediaFilter: "all" | "image" | "video"
  onMediaFilterChange: (filter: "all" | "image" | "video") => void
  onSelectionModeChange: (isSelectionMode: boolean) => void
  onUpload: () => void
  onThemeChange: (theme: ThemePreference) => void
  onViewChange: (view: "all" | "folders") => void
  theme: ThemePreference
}

export function LibraryToolbar({
  activeView,
  canSelect,
  folderPath,
  isSelectionMode,
  mediaFilter,
  onMediaFilterChange,
  onSelectionModeChange,
  onThemeChange,
  onUpload,
  onViewChange,
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
        {activeView === "all" ? (
          <Tooltip delay={0}>
            <ToggleButton
              isIconOnly
              aria-label={
                isSelectionMode
                  ? "Exit selection mode"
                  : "Select multiple assets"
              }
              isDisabled={!canSelect}
              isSelected={isSelectionMode}
              size="sm"
              variant="ghost"
              onChange={onSelectionModeChange}
            >
              {isSelectionMode ? (
                <SelectionSlashIcon aria-hidden="true" />
              ) : (
                <SelectionPlusIcon aria-hidden="true" />
              )}
            </ToggleButton>
            <Tooltip.Content>
              {isSelectionMode ? "Exit selection mode" : "Select multiple"}
            </Tooltip.Content>
          </Tooltip>
        ) : null}
        <Tooltip delay={0}>
          <Button
            isIconOnly
            aria-label="Upload images"
            size="sm"
            variant="outline"
            onPress={onUpload}
          >
            <UploadSimpleIcon aria-hidden="true" />
          </Button>
          <Tooltip.Content>Upload images</Tooltip.Content>
        </Tooltip>
        <LibraryShortcuts />
        <Segment
          aria-label="Library views"
          selectedKey={activeView}
          size="sm"
          variant="default"
          onSelectionChange={(key) => onViewChange(key as "all" | "folders")}
        >
          <Segment.Item id="all">All</Segment.Item>
          <Segment.Item id="folders">Folders</Segment.Item>
        </Segment>
        {activeView === "all" ? (
          <Segment
            aria-label="Media filter"
            selectedKey={mediaFilter}
            size="sm"
            variant="default"
            onSelectionChange={(key) =>
              onMediaFilterChange(key as "all" | "image" | "video")
            }
          >
            <Segment.Item aria-label="All media" id="all">
              All
            </Segment.Item>
            <Segment.Item id="image">Images</Segment.Item>
            <Segment.Item id="video">Videos</Segment.Item>
          </Segment>
        ) : null}
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
