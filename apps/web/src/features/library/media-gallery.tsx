import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsInSimpleIcon,
  FolderSimpleIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { Button, Label, Modal, Typography } from "@heroui/react"
import { ContextMenu } from "@heroui-pro/react"
import type { LibraryItem } from "@stillroom/contracts"

type MediaGalleryProps = {
  items: LibraryItem[]
  onMoveItem: (itemId: string) => void
  onRemoveItem: (itemId: string) => void
}

export function MediaGallery({
  items,
  onMoveItem,
  onRemoveItem,
}: MediaGalleryProps) {
  const displayItems = useMemo(
    () => items.filter((item) => Boolean(item.thumbnailUrl)),
    [items]
  )
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (displayItems.length === 0) {
    return (
      <div className="gallery-empty">
        <Typography color="muted">No images here yet.</Typography>
      </div>
    )
  }

  return (
    <>
      <div aria-label="Saved images" className="media-grid">
        {displayItems.map((item, index) => (
          <MediaCard
            item={item}
            key={item.id}
            onMove={() => onMoveItem(item.id)}
            onOpen={() => setActiveIndex(index)}
            onRemove={() => onRemoveItem(item.id)}
          />
        ))}
      </div>
      <ImageLightbox
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
  onRemove: () => void
}

function MediaCard({ item, onMove, onOpen, onRemove }: MediaCardProps) {
  return (
    <ContextMenu>
      <ContextMenu.Trigger>
        <div className="media-unit">
          <button
            aria-label={`Open ${item.title}`}
            className="media-card"
            onClick={onOpen}
            type="button"
          >
            <img
              alt={item.title}
              height={item.height}
              loading="lazy"
              src={item.thumbnailUrl}
              width={item.width}
            />
          </button>
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Popover>
        <ContextMenu.Menu
          aria-label={`Manage ${item.title}`}
          onAction={(key) => {
            if (key === "move") onMove()
            if (key === "remove") onRemove()
          }}
        >
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

type ImageLightboxProps = {
  activeIndex: number | null
  items: LibraryItem[]
  onActiveIndexChange: (index: number | null) => void
}

function ImageLightbox({
  activeIndex,
  items,
  onActiveIndexChange,
}: ImageLightboxProps) {
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
        <Modal.Dialog aria-label={activeItem?.title ?? "Image preview"}>
          <Modal.CloseTrigger />
          {activeItem ? (
            <div className="lightbox">
              <div className="lightbox__toolbar">
                <Button
                  aria-label="Previous image"
                  isDisabled={!canGoBack}
                  isIconOnly
                  variant="tertiary"
                  onPress={() =>
                    onActiveIndexChange(Math.max(0, currentIndex - 1))
                  }
                >
                  <ArrowLeftIcon aria-hidden="true" />
                </Button>
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
                <Button
                  aria-label="Next image"
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
                <img
                  alt={activeItem.title}
                  className="lightbox__image"
                  src={activeItem.thumbnailUrl}
                  style={{ "--lightbox-scale": scale } as React.CSSProperties}
                />
              </div>
            </div>
          ) : null}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
