import { FolderSimpleIcon, TrashIcon, XIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

type SelectionBarProps = {
  selectedCount: number
  onClear: () => void
  onMove: () => void
  onRemove: () => void
}

export function SelectionBar({
  selectedCount,
  onClear,
  onMove,
  onRemove,
}: SelectionBarProps) {
  if (selectedCount === 0) {
    return null
  }

  return (
    <div className="fixed inset-x-4 bottom-5 z-40 mx-auto flex w-fit items-center gap-2 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-xl">
      <span className="px-2 text-sm font-medium tabular-nums">
        {selectedCount} selected
      </span>
      <Separator orientation="vertical" />
      <Button onClick={onMove} variant="ghost" size="lg">
        <FolderSimpleIcon data-icon="inline-start" aria-hidden="true" />
        Move
      </Button>
      <Button onClick={onRemove} variant="ghost" size="lg">
        <TrashIcon data-icon="inline-start" aria-hidden="true" />
        Remove
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Clear selection"
        onClick={onClear}
      >
        <XIcon aria-hidden="true" />
      </Button>
    </div>
  )
}
