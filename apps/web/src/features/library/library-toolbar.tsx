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
import type { DriveLibraryUser } from "@/server/drive/library.server"
import { LibraryAccountMenu } from "./library-account-menu"
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
  user?: DriveLibraryUser
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
  user,
}: LibraryToolbarProps) {
  return (
    <header className="sticky top-0 z-20 flex min-h-[4.5rem] flex-col items-start justify-between gap-4 bg-[color-mix(in_oklch,var(--background)_92%,transparent)] px-[clamp(1rem,2vw,2rem)] py-4 backdrop-blur-md min-[52rem]:flex-row min-[52rem]:items-center">
      <div className="min-w-0 overflow-hidden">
        <Breadcrumbs aria-label="Current folder">
          <Breadcrumbs.Item href="/">Akasha</Breadcrumbs.Item>
          {folderPath.map((folder) => (
            <Breadcrumbs.Item href={`/?folder=${folder.id}`} key={folder.id}>
              {folder.name}
            </Breadcrumbs.Item>
          ))}
        </Breadcrumbs>
      </div>
      <div className="flex w-full flex-wrap items-center gap-3 min-[52rem]:w-auto min-[52rem]:flex-none min-[52rem]:flex-nowrap">
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
        <LibraryAccountMenu user={user} />
      </div>
    </header>
  )
}
