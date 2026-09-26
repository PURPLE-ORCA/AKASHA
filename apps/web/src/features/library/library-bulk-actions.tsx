import {
  StackPlusIcon,
  FolderSimpleIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react"
import { Button, Chip, Separator, Tooltip } from "@heroui/react"
import { ActionBar } from "@heroui-pro/react"

type LibraryBulkActionsProps = {
  onAddToPool?: () => void
  onDelete: () => void
  onExit: () => void
  onMove: () => void
  selectedCount: number
}

export function LibraryBulkActions({
  onAddToPool,
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
        {onAddToPool ? (
          <Button
            aria-label="Add selected assets to pool"
            size="sm"
            variant="ghost"
            onPress={onAddToPool}
          >
            <StackPlusIcon aria-hidden="true" />
            <span className="action-bar__label">Pool</span>
          </Button>
        ) : null}
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
