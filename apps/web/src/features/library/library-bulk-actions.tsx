import { FolderSimpleIcon, TrashIcon, XIcon } from "@phosphor-icons/react"
import { Button, Chip, Separator, Tooltip } from "@heroui/react"
import { ActionBar } from "@heroui-pro/react"

type LibraryBulkActionsProps = {
  onDelete: () => void
  onExit: () => void
  onMove: () => void
  selectedCount: number
}

export function LibraryBulkActions({
  onDelete,
  onExit,
  onMove,
  selectedCount,
}: LibraryBulkActionsProps) {
  return (
    <ActionBar aria-label="Selected asset actions" isOpen={selectedCount > 0}>
      <ActionBar.Prefix>
        <Chip size="sm">{selectedCount} selected</Chip>
      </ActionBar.Prefix>
      <Separator orientation="vertical" />
      <ActionBar.Content>
        <Button
          aria-label="Move selected assets"
          size="sm"
          variant="ghost"
          onPress={onMove}
        >
          <FolderSimpleIcon aria-hidden="true" />
          <span className="action-bar__label">Move</span>
        </Button>
        <Button
          aria-label="Delete selected assets"
          size="sm"
          variant="danger-soft"
          onPress={onDelete}
        >
          <TrashIcon aria-hidden="true" />
          <span className="action-bar__label">Delete</span>
        </Button>
      </ActionBar.Content>
      <Separator orientation="vertical" />
      <ActionBar.Suffix>
        <Tooltip delay={0}>
          <Button
            isIconOnly
            aria-label="Exit selection mode"
            size="sm"
            variant="ghost"
            onPress={onExit}
          >
            <XIcon aria-hidden="true" />
          </Button>
          <Tooltip.Content>Exit selection mode</Tooltip.Content>
        </Tooltip>
      </ActionBar.Suffix>
    </ActionBar>
  )
}
