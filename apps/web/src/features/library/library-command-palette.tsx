import {
  DesktopIcon,
  FolderSimpleIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  SunIcon,
} from "@phosphor-icons/react"
import { Typography } from "@heroui/react"
import { Command } from "@heroui-pro/react"
import type { LibraryFolder } from "@stillroom/contracts"

import type { ThemePreference } from "./library-toolbar"

type LibraryCommandPaletteProps = {
  folders: LibraryFolder[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onThemeChange: (theme: ThemePreference) => void
}

export function LibraryCommandPalette({
  folders,
  open,
  onOpenChange,
  onThemeChange,
}: LibraryCommandPaletteProps) {
  function runCommand(key: React.Key) {
    const command = String(key)
    onOpenChange(false)

    if (command === "folder:root") {
      window.location.assign("/")
      return
    }

    if (command.startsWith("folder:")) {
      window.location.assign(`/?folder=${command.slice("folder:".length)}`)
      return
    }

    if (command.startsWith("theme:")) {
      onThemeChange(command.slice("theme:".length) as ThemePreference)
    }
  }

  return (
    <Command>
      <Command.Backdrop
        isOpen={open}
        variant="blur"
        onOpenChange={onOpenChange}
      >
        <Command.Container>
          <Command.Dialog>
            <Command.InputGroup>
              <Command.InputGroup.Prefix>
                <MagnifyingGlassIcon aria-hidden="true" />
              </Command.InputGroup.Prefix>
              <Command.InputGroup.Input placeholder="Search folders and commands" />
              <Command.InputGroup.ClearButton />
            </Command.InputGroup>
            <Command.List
              aria-label="Stillroom commands"
              renderEmptyState={() => (
                <Typography color="muted">No matching commands.</Typography>
              )}
              onAction={runCommand}
            >
              <Command.Group heading="Folders">
                <Command.Item id="folder:root" textValue="Stillroom home">
                  <HouseIcon aria-hidden="true" />
                  <Typography>Stillroom</Typography>
                </Command.Item>
                {folders.map((folder) => (
                  <Command.Item
                    id={`folder:${folder.id}`}
                    key={folder.id}
                    textValue={folder.name}
                  >
                    <FolderSimpleIcon aria-hidden="true" />
                    <Typography>{folder.name}</Typography>
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Theme">
                <Command.Item id="theme:light" textValue="Light theme">
                  <SunIcon aria-hidden="true" />
                  <Typography>Light theme</Typography>
                </Command.Item>
                <Command.Item id="theme:dark" textValue="Dark theme">
                  <MoonIcon aria-hidden="true" />
                  <Typography>Dark theme</Typography>
                </Command.Item>
                <Command.Item id="theme:system" textValue="System theme">
                  <DesktopIcon aria-hidden="true" />
                  <Typography>System theme</Typography>
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command.Dialog>
        </Command.Container>
      </Command.Backdrop>
    </Command>
  )
}
