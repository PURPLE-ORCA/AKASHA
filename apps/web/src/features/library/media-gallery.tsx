import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsInSimpleIcon,
  DownloadSimpleIcon,
  FolderSimpleIcon,
  MinusIcon,
  PlusIcon,
  PlayIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { Button, Label, Modal, Typography } from "@heroui/react"
import { ContextMenu } from "@heroui-pro/react"
import type { LibraryItem } from "@akasha/contracts"

const INITIAL_RENDER_COUNT = 48
const RENDER_BATCH_SIZE = 48
const PRIORITY_IMAGE_COUNT = 8

type MediaGalleryProps = {
  items: LibraryItem[]
  onMoveItem: (itemId: string) => void
  onOpenFolder: (folderId: string) => void
  onRemoveItem: (itemId: string) => void
}

export function MediaGallery({
  items,
  onMoveItem,
  onOpenFolder,
  onRemoveItem,
}: MediaGalleryProps) {
  const displayItems = useMemo(() => items, [items])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_COUNT)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setVisibleCount(INITIAL_RENDER_COUNT)
  }, [displayItems])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || visibleCount >= displayItems.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        setVisibleCount((count) =>
          Math.min(displayItems.length, count + RENDER_BATCH_SIZE)
        )
      },
      { rootMargin: "1000px 0px" }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [displayItems.length, visibleCount])

  if (displayItems.length === 0) {
    return (
      <div className="gallery-empty">
        <Typography color="muted">No media here yet.</Typography>
      </div>
    )
  }

  return (
    <>
      <div aria-label="Saved media" className="media-grid">
        {displayItems.slice(0, visibleCount).map((item, index) => (
          <MediaCard
            item={item}
            key={item.id}
            onMove={() => onMoveItem(item.id)}
            onOpen={() => setActiveIndex(index)}
            onOpenFolder={() => onOpenFolder(item.folderId)}
            onRemove={() => onRemoveItem(item.id)}
            priority={index < PRIORITY_IMAGE_COUNT}
          />
        ))}
      </div>
      {visibleCount < displayItems.length ? (
        <div
          aria-hidden="true"
          className="gallery-sentinel"
          ref={loadMoreRef}
        />
      ) : null}
      <MediaLightbox
        activeIndex={activeIndex}
        items={displayItems}
        onActiveIndexChange={setActiveIndex}
      />
    </>
  )
}

type MediaCardProps = {
  item: LibraryItem
  onMove: () => void
  onOpen: () => void
  onOpenFolder: () => void
  onRemove: () => void
  priority: boolean
}

function MediaCard({
  item,
  onMove,
  onOpen,
  onOpenFolder,
  onRemove,
  priority,
}: MediaCardProps) {
  return (
    <ContextMenu>
      <ContextMenu.Trigger>
        <div className="media-unit">
          <button
            aria-label={`Open ${item.title}`}
            className="media-card"
            onClick={onOpen}
            onKeyDown={(event) => {
              if (
                event.key !== "ArrowUp" ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.repeat
              ) {
                return
              }

              event.preventDefault()
              onOpenFolder()
            }}
            type="button"
          >
            <span
              className={`media-card__visual media-card__visual--${item.kind}`}
            >
              {item.thumbnailUrl ? (
                <img
                  alt={item.title}
                  fetchPriority={priority ? "high" : "auto"}
                  height={item.height}
                  loading={priority ? "eager" : "lazy"}
                  src={item.thumbnailUrl}
                  width={item.width}
                />
              ) : (
                <span aria-hidden="true" className="media-card__placeholder">
                  <PlayIcon weight="fill" />
                </span>
              )}
              {item.kind === "video" && item.thumbnailUrl ? (
                <span aria-hidden="true" className="media-card__play">
                  <PlayIcon weight="fill" />
                </span>
              ) : null}
              {item.kind === "video" && item.durationSeconds !== undefined ? (
                <span className="media-card__duration">
                  {formatDuration(item.durationSeconds)}
                </span>
              ) : null}
            </span>
          </button>
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Popover>
        <ContextMenu.Menu
          aria-label={`Manage ${item.title}`}
          onAction={(key) => {
            if (key === "download" && item.kind === "image") {
              downloadImage(item)
            }
            if (key === "move") onMove()
            if (key === "remove") onRemove()
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
}

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
            <div className="lightbox">
              <div className="lightbox__toolbar">
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
              <div className="lightbox__stage">
                {activeItem.kind === "video" ? (
                  activeItem.storageMode !== "reference" ? (
                    <video
                      className="lightbox__video"
                      controls
                      key={activeItem.id}
                      playsInline
                      poster={activeItem.thumbnailUrl}
                      preload="metadata"
                      src={`/api/media/${activeItem.driveFileId}`}
                    />
                  ) : (
                    <div className="lightbox__reference">
                      <PlayIcon aria-hidden="true" weight="fill" />
                      <Typography color="muted">
                        This clip is kept as a link to its original source.
                      </Typography>
                      <a
                        href={activeItem.sourceUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open original
                      </a>
                    </div>
                  )
                ) : (
                  <img
                    alt={activeItem.title}
                    className="lightbox__image"
                    src={activeItem.thumbnailUrl}
                    style={{ "--lightbox-scale": scale } as React.CSSProperties}
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

function formatDuration(durationSeconds: number) {
  const totalSeconds = Math.max(0, Math.round(durationSeconds))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
