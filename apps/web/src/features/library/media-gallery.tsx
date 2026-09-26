import { memo, useEffect, useRef, useState } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsInSimpleIcon,
  DownloadSimpleIcon,
  FolderSimpleIcon,
  ImageIcon,
  MinusIcon,
  PlusIcon,
  PlayIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { Button, Checkbox, Label, Modal, Typography } from "@heroui/react"
import { ContextMenu } from "@heroui-pro/react"
import type { LibraryItem } from "@akasha/contracts"

const PRIORITY_IMAGE_COUNT = 2
const ORIGINAL_PREFETCH_DELAY_MS = 150

type MediaGalleryProps = {
  emptyMessage?: string
  isSelectionMode: boolean
  items: LibraryItem[]
  onMoveItem: (itemId: string) => void
  onOpenFolder: (folderId: string) => void
  onRemoveItem: (itemId: string) => void
  onSelectionChange: (itemId: string, isSelected: boolean) => void
  selectedItemIds: ReadonlySet<string>
}

export const MediaGallery = memo(function MediaGallery({
  emptyMessage = "No media here yet.",
  isSelectionMode,
  items,
  onMoveItem,
  onOpenFolder,
  onRemoveItem,
  onSelectionChange,
  selectedItemIds,
}: MediaGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (items.length === 0) {
    return (
      <div className="grid min-h-[28rem] place-items-center">
        <Typography color="muted">{emptyMessage}</Typography>
      </div>
    )
  }

  return (
    <>
      <div
        aria-label="Saved media"
        className="columns-1 gap-4 sm:columns-2 min-[56rem]:columns-3 min-[76rem]:columns-4 min-[100rem]:columns-5"
      >
        {items.map((item, index) => (
          <MediaCard
            index={index}
            isSelected={selectedItemIds.has(item.id)}
            isSelectionMode={isSelectionMode}
            item={item}
            key={item.id}
            onMove={onMoveItem}
            onOpen={setActiveIndex}
            onOpenFolder={onOpenFolder}
            onRemove={onRemoveItem}
            onSelectionChange={onSelectionChange}
            priority={index < PRIORITY_IMAGE_COUNT}
          />
        ))}
      </div>
      <MediaLightbox
        activeIndex={activeIndex}
        items={items}
        onActiveIndexChange={setActiveIndex}
      />
    </>
  )
})

type MediaCardProps = {
  index: number
  isSelected: boolean
  isSelectionMode: boolean
  item: LibraryItem
  onMove: (itemId: string) => void
  onOpen: (index: number) => void
  onOpenFolder: (folderId: string) => void
  onRemove: (itemId: string) => void
  onSelectionChange: (itemId: string, isSelected: boolean) => void
  priority: boolean
}

const MediaCard = memo(function MediaCard({
  index,
  isSelected,
  isSelectionMode,
  item,
  onMove,
  onOpen,
  onOpenFolder,
  onRemove,
  onSelectionChange,
  priority,
}: MediaCardProps) {
  const [hasImageError, setHasImageError] = useState(false)
  const prefetchTimeout = useRef<number | undefined>(undefined)
  useEffect(
    () => () => window.clearTimeout(prefetchTimeout.current),
    [isSelectionMode, item]
  )

  function cancelPrefetch() {
    window.clearTimeout(prefetchTimeout.current)
  }

  const hasIntrinsicSize = Boolean(item.width && item.height)
  const card = (
    <div
      className={`relative mb-4 break-inside-avoid rounded-2xl ${isSelected ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""}`}
    >
      {isSelectionMode ? (
        <div className="absolute top-3 left-3 z-10 rounded-lg bg-surface/90 p-1 shadow-surface backdrop-blur-sm">
          <Checkbox
            aria-label={`${isSelected ? "Deselect" : "Select"} ${item.title}`}
            isSelected={isSelected}
            onChange={(nextSelected) => onSelectionChange(item.id, nextSelected)}
          >
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
            </Checkbox.Content>
          </Checkbox>
        </div>
      ) : null}
      <button
        aria-label={
          isSelectionMode
            ? `${isSelected ? "Deselect" : "Select"} ${item.title}`
            : `Open ${item.title}`
        }
        aria-pressed={isSelectionMode ? isSelected : undefined}
        className="block w-full cursor-pointer appearance-none overflow-hidden rounded-2xl border-0 bg-transparent p-0 text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        onClick={
          isSelectionMode
            ? () => onSelectionChange(item.id, !isSelected)
            : () => onOpen(index)
        }
        onFocus={() => {
          cancelPrefetch()
          if (!isSelectionMode) preloadOriginalImage(item)
        }}
        onKeyDown={(event) => {
          if (
            isSelectionMode ||
            event.key !== "ArrowUp" ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.repeat
          ) {
            return
          }

          event.preventDefault()
          onOpenFolder(item.folderId)
        }}
        onPointerEnter={(event) => {
          if (
            isSelectionMode ||
            item.kind !== "image" ||
            event.pointerType === "touch"
          ) {
            return
          }
          cancelPrefetch()
          prefetchTimeout.current = window.setTimeout(
            () => preloadOriginalImage(item),
            ORIGINAL_PREFETCH_DELAY_MS
          )
        }}
        onPointerLeave={cancelPrefetch}
        onPointerCancel={cancelPrefetch}
        onPointerDown={cancelPrefetch}
        type="button"
      >
        <span
          className={`relative block w-full overflow-hidden bg-surface-secondary ${item.kind === "video" ? "aspect-video min-h-40" : hasIntrinsicSize ? "" : "aspect-square min-h-40"}`}
        >
          {item.thumbnailUrl && !hasImageError ? (
            <img
              alt={item.title}
              className={`block w-full ${item.kind === "video" || !hasIntrinsicSize ? "h-full object-cover" : "h-auto"}`}
              decoding="async"
              fetchPriority={priority ? "high" : "auto"}
              height={item.height}
              loading={priority ? "eager" : "lazy"}
              onError={() => setHasImageError(true)}
              src={item.thumbnailUrl}
              width={item.width}
            />
          ) : (
            <MediaPlaceholder kind={item.kind} />
          )}
          {item.kind === "video" && item.thumbnailUrl ? (
            <span
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 grid size-13 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[oklch(0.12_0_0/70%)] text-white backdrop-blur-sm"
            >
              <PlayIcon className="ml-0.5" size={20} weight="fill" />
            </span>
          ) : null}
          {item.kind === "video" && item.durationSeconds !== undefined ? (
            <span className="absolute right-2.5 bottom-2.5 rounded-md bg-[oklch(0.12_0_0/76%)] px-2 py-0.5 text-xs leading-tight text-white tabular-nums">
              {formatDuration(item.durationSeconds)}
            </span>
          ) : null}
        </span>
      </button>
    </div>
  )

  if (isSelectionMode) return card

  return (
    <ContextMenu>
      <ContextMenu.Trigger
        render={(props) => <div {...props} className="block w-full" />}
      >
        {card}
      </ContextMenu.Trigger>
      <ContextMenu.Popover>
        <ContextMenu.Menu
          aria-label={`Manage ${item.title}`}
          onAction={(key) => {
            if (key === "download" && item.kind === "image") {
              downloadImage(item)
            }
            if (key === "move") onMove(item.id)
            if (key === "remove") onRemove(item.id)
          }}
        >
          {item.kind === "image" ? (
            <ContextMenu.Item id="download" textValue="Download">
              <DownloadSimpleIcon aria-hidden="true" />
              <Label>Download</Label>
            </ContextMenu.Item>
          ) : null}
          <ContextMenu.Item id="move" textValue="Move to folder">
            <FolderSimpleIcon aria-hidden="true" />
            <Label>Move to folder</Label>
          </ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item id="remove" textValue="Delete" variant="danger">
            <TrashIcon aria-hidden="true" />
            <Label>Delete</Label>
          </ContextMenu.Item>
        </ContextMenu.Menu>
      </ContextMenu.Popover>
    </ContextMenu>
  )
})

const imageFileExtensions: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

function downloadImage(item: LibraryItem) {
  const link = document.createElement("a")
  const extension = item.mimeType
    ? imageFileExtensions[item.mimeType]
    : undefined
  const title = item.title.trim()

  link.download =
    extension && !title.toLowerCase().endsWith(`.${extension}`)
      ? `${title}.${extension}`
      : title
  link.href = `/api/media/${encodeURIComponent(item.driveFileId)}`
  link.click()
}

type MediaLightboxProps = {
  activeIndex: number | null
  items: LibraryItem[]
  onActiveIndexChange: (index: number | null) => void
}

function MediaLightbox({
  activeIndex,
  items,
  onActiveIndexChange,
}: MediaLightboxProps) {
  const [scale, setScale] = useState(1)
  const currentIndex = activeIndex ?? 0
  const activeItem = activeIndex === null ? null : items[activeIndex]
  const canGoBack = activeIndex !== null && activeIndex > 0
  const canGoForward = activeIndex !== null && activeIndex < items.length - 1

  useEffect(() => {
    setScale(1)
  }, [activeIndex])

  useEffect(() => {
    if (activeIndex === null) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" && currentIndex > 0) {
        event.preventDefault()
        onActiveIndexChange(currentIndex - 1)
      }
      if (event.key === "ArrowRight" && currentIndex < items.length - 1) {
        event.preventDefault()
        onActiveIndexChange(currentIndex + 1)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [activeIndex, currentIndex, items.length, onActiveIndexChange])

  return (
    <Modal.Backdrop
      isOpen={activeItem !== null}
      onOpenChange={(open) => {
        if (!open) onActiveIndexChange(null)
      }}
    >
      <Modal.Container size="full">
        <Modal.Dialog aria-label={activeItem?.title ?? "Media preview"}>
          <Modal.CloseTrigger />
          {activeItem ? (
            <div className="grid min-h-dvh grid-rows-[auto_minmax(0,1fr)] bg-background">
              <div className="flex items-center justify-center gap-2 p-3">
                <Button
                  aria-label="Previous media"
                  isDisabled={!canGoBack}
                  isIconOnly
                  variant="tertiary"
                  onPress={() =>
                    onActiveIndexChange(Math.max(0, currentIndex - 1))
                  }
                >
                  <ArrowLeftIcon aria-hidden="true" />
                </Button>
                {activeItem.kind === "image" ? (
                  <>
                    <Button
                      aria-label="Zoom out"
                      isDisabled={scale <= 1}
                      isIconOnly
                      variant="tertiary"
                      onPress={() =>
                        setScale((current) => Math.max(1, current - 0.25))
                      }
                    >
                      <MinusIcon aria-hidden="true" />
                    </Button>
                    <Button
                      aria-label="Reset zoom"
                      isIconOnly
                      variant="tertiary"
                      onPress={() => setScale(1)}
                    >
                      <ArrowsInSimpleIcon aria-hidden="true" />
                    </Button>
                    <Button
                      aria-label="Zoom in"
                      isDisabled={scale >= 3}
                      isIconOnly
                      variant="tertiary"
                      onPress={() =>
                        setScale((current) => Math.min(3, current + 0.25))
                      }
                    >
                      <PlusIcon aria-hidden="true" />
                    </Button>
                  </>
                ) : null}
                <Button
                  aria-label="Next media"
                  isDisabled={!canGoForward}
                  isIconOnly
                  variant="tertiary"
                  onPress={() =>
                    onActiveIndexChange(
                      Math.min(items.length - 1, currentIndex + 1)
                    )
                  }
                >
                  <ArrowRightIcon aria-hidden="true" />
                </Button>
              </div>
              <div className="grid min-h-0 place-items-center overflow-auto overscroll-contain p-4">
                {activeItem.kind === "video" ? (
                  activeItem.storageMode !== "reference" ? (
                    <video
                      className="block max-h-[calc(100dvh-6rem)] w-[min(100%,90rem)] bg-black"
                      controls
                      key={activeItem.id}
                      playsInline
                      poster={activeItem.thumbnailUrl}
                      preload="metadata"
                      src={`/api/media/${activeItem.driveFileId}`}
                    />
                  ) : (
                    <div className="grid max-w-[26rem] justify-items-center gap-4 text-center">
                      <PlayIcon
                        aria-hidden="true"
                        className="text-muted"
                        size={48}
                        weight="fill"
                      />
                      <Typography color="muted">
                        This clip is kept as a link to its original source.
                      </Typography>
                      <a
                        className="font-semibold text-link underline-offset-4 hover:underline"
                        href={activeItem.sourceUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open original
                      </a>
                    </div>
                  )
                ) : (
                  <ProgressiveImage
                    item={activeItem}
                    key={activeItem.id}
                    scale={scale}
                  />
                )}
              </div>
            </div>
          ) : null}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}

function ProgressiveImage({
  item,
  scale,
}: {
  item: LibraryItem
  scale: number
}) {
  const [hasOriginalError, setHasOriginalError] = useState(false)
  const [hasPreviewError, setHasPreviewError] = useState(false)
  const [isModifierHeld, setIsModifierHeld] = useState(false)
  const [isPointerInside, setIsPointerInside] = useState(false)
  const zoomFrame = useRef<HTMLDivElement | null>(null)
  const zoomBounds = useRef<DOMRect | null>(null)
  const originalUrl = `/api/media/${encodeURIComponent(item.driveFileId)}`
  const isInspecting = isModifierHeld && isPointerInside

  useEffect(() => {
    function onModifierChange(event: KeyboardEvent) {
      if (event.key === "Alt" || event.key === "Shift") {
        const isHeld =
          event.type === "keydown" || event.altKey || event.shiftKey
        setIsModifierHeld(isHeld)
        if (isHeld) {
          setIsPointerInside(
            (current) =>
              current || Boolean(zoomFrame.current?.matches(":hover"))
          )
        }
      }
    }

    function onBlur() {
      setIsModifierHeld(false)
    }

    window.addEventListener("keydown", onModifierChange)
    window.addEventListener("keyup", onModifierChange)
    window.addEventListener("blur", onBlur)
    return () => {
      window.removeEventListener("keydown", onModifierChange)
      window.removeEventListener("keyup", onModifierChange)
      window.removeEventListener("blur", onBlur)
    }
  }, [])

  return (
    <div
      className={`grid place-items-center transition-transform motion-reduce:transition-none ${isInspecting ? "cursor-zoom-in" : ""}`}
      ref={zoomFrame}
      onPointerEnter={(event) => {
        zoomBounds.current = event.currentTarget.getBoundingClientRect()
        setIsPointerInside(true)
        setIsModifierHeld(event.altKey || event.shiftKey)
        updateZoomOrigin(
          event.currentTarget,
          zoomBounds.current,
          event.clientX,
          event.clientY
        )
      }}
      onPointerLeave={() => setIsPointerInside(false)}
      onPointerMove={(event) => {
        setIsModifierHeld(event.altKey || event.shiftKey)
        if (zoomBounds.current) {
          updateZoomOrigin(
            event.currentTarget,
            zoomBounds.current,
            event.clientX,
            event.clientY
          )
        }
      }}
      style={{
        transform: `scale(${isInspecting ? Math.max(2, scale) : scale})`,
        transformOrigin: isInspecting ? "var(--zoom-origin, center)" : "center",
      }}
    >
      {item.thumbnailUrl && !hasPreviewError ? (
        <img
          alt=""
          className="block max-h-[calc(100dvh-6rem)] max-w-[min(100%,100rem)] object-contain [grid-area:1/1]"
          decoding="async"
          height={item.height}
          onError={() => setHasPreviewError(true)}
          src={item.thumbnailUrl}
          width={item.width}
        />
      ) : (
        <span className="grid min-h-64 min-w-64 place-items-center text-muted [grid-area:1/1]">
          <ImageIcon aria-hidden="true" size={48} />
        </span>
      )}
      {!hasOriginalError ? (
        <img
          alt={item.title}
          className="block max-h-[calc(100dvh-6rem)] max-w-[min(100%,100rem)] object-contain [grid-area:1/1]"
          decoding="async"
          fetchPriority="high"
          height={item.height}
          onError={() => setHasOriginalError(true)}
          src={originalUrl}
          width={item.width}
        />
      ) : null}
    </div>
  )
}

function updateZoomOrigin(
  element: HTMLDivElement,
  bounds: DOMRect,
  clientX: number,
  clientY: number
) {
  if (bounds.width === 0 || bounds.height === 0) return

  const x = Math.min(
    100,
    Math.max(0, ((clientX - bounds.left) / bounds.width) * 100)
  )
  const y = Math.min(
    100,
    Math.max(0, ((clientY - bounds.top) / bounds.height) * 100)
  )
  element.style.setProperty("--zoom-origin", `${x}% ${y}%`)
}

function preloadOriginalImage(item: LibraryItem) {
  if (item.kind !== "image") return

  const image = new Image()
  image.decoding = "async"
  image.fetchPriority = "low"
  image.src = `/api/media/${encodeURIComponent(item.driveFileId)}`
}

function MediaPlaceholder({ kind }: { kind: LibraryItem["kind"] }) {
  const Icon = kind === "video" ? PlayIcon : ImageIcon

  return (
    <span
      aria-hidden="true"
      className="grid h-full min-h-40 w-full place-items-center text-muted"
    >
      <Icon size={44} weight={kind === "video" ? "fill" : "regular"} />
    </span>
  )
}

function formatDuration(durationSeconds: number) {
  const totalSeconds = Math.max(0, Math.round(durationSeconds))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
