import {
  ArrowSquareOutIcon,
  DotsThreeIcon,
  FolderSimpleIcon,
  PlayIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import type { LibraryItem } from "@stillroom/contracts"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type MediaGalleryProps = {
  items: LibraryItem[]
  selectedItemIds: Set<string>
  onItemSelectionChange: (itemId: string, selected: boolean) => void
  onMoveItems: (itemIds: string[]) => void
  onRemoveItems: (itemIds: string[]) => void
  actionsDisabled: boolean
}

export function MediaGallery({
  items,
  selectedItemIds,
  onItemSelectionChange,
  onMoveItems,
  onRemoveItems,
  actionsDisabled,
}: MediaGalleryProps) {
  if (items.length === 0) {
    return (
      <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center">
        <div className="max-w-sm">
          <h2 className="text-lg font-semibold">No inspiration found</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Try another search, or add something new to this folder.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      aria-label="Saved inspiration"
      className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4"
    >
      {items.map((item) => (
        <MediaCard
          item={item}
          key={item.id}
          actionsDisabled={actionsDisabled}
          onMove={() => onMoveItems([item.id])}
          onRemove={() => onRemoveItems([item.id])}
          onSelectionChange={onItemSelectionChange}
          selected={selectedItemIds.has(item.id)}
        />
      ))}
    </div>
  )
}

type MediaCardProps = {
  item: LibraryItem
  selected: boolean
  actionsDisabled: boolean
  onMove: () => void
  onRemove: () => void
  onSelectionChange: (itemId: string, selected: boolean) => void
}

function MediaCard({
  item,
  selected,
  actionsDisabled,
  onMove,
  onRemove,
  onSelectionChange,
}: MediaCardProps) {
  const duration = item.durationSeconds
    ? formatDuration(item.durationSeconds)
    : null

  return (
    <article
      className="group relative mb-4 break-inside-avoid overflow-hidden rounded-xl border border-border bg-card text-card-foreground transition-[border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-md data-[selected=true]:border-primary data-[selected=true]:ring-2 data-[selected=true]:ring-primary/15"
      data-selected={selected}
    >
      <div className="relative overflow-hidden bg-muted">
        {item.thumbnailUrl ? (
          <img
            alt={item.title}
            className="h-auto w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.015]"
            height={item.height}
            loading="lazy"
            src={item.thumbnailUrl}
            width={item.width}
          />
        ) : (
          <div className="grid aspect-video place-items-center bg-primary/10 text-primary">
            <PlayIcon aria-hidden="true" className="size-10" weight="duotone" />
          </div>
        )}
        <div className="absolute top-3 left-3 rounded-md bg-background/90 p-2 shadow-sm backdrop-blur">
          <Checkbox
            aria-label={`Select ${item.title}`}
            checked={selected}
            onCheckedChange={(checked) =>
              onSelectionChange(item.id, checked === true)
            }
          />
        </div>
        {item.kind === "video" ? (
          <div
            className="absolute inset-0 grid place-items-center"
            aria-hidden="true"
          >
            <span className="grid size-14 place-items-center rounded-full bg-background/90 text-foreground shadow-lg backdrop-blur">
              <PlayIcon className="ml-0.5 size-6" weight="fill" />
            </span>
          </div>
        ) : null}
        {duration ? (
          <span className="absolute right-3 bottom-3 rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background tabular-nums">
            {duration}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-medium">{item.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.sourceLabel}
          </p>
        </div>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      aria-label={`Actions for ${item.title}`}
                    />
                  }
                />
              }
            >
              <DotsThreeIcon aria-hidden="true" weight="bold" />
            </TooltipTrigger>
            <TooltipContent>Item actions</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              render={
                <a href={item.sourceUrl} rel="noreferrer" target="_blank" />
              }
            >
              <ArrowSquareOutIcon aria-hidden="true" />
              Open source
            </DropdownMenuItem>
            <DropdownMenuItem disabled={actionsDisabled} onClick={onMove}>
              <FolderSimpleIcon aria-hidden="true" />
              Move to folder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={actionsDisabled}
              onClick={onRemove}
              variant="destructive"
            >
              <TrashIcon aria-hidden="true" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  )
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
