type Rect = {
  bottom: number
  height: number
  left: number
  right: number
  top: number
  width: number
}

type RectSource = {
  getBoundingClientRect(): Rect
}

type MediaActionPositionOptions = {
  actionHeight: number
  actionWidth: number
  inset: number
  viewportHeight: number
  viewportWidth: number
}

export function findSmallestMediaAtPoint<T extends RectSource>(
  media: T[],
  clientX: number,
  clientY: number
) {
  return media
    .filter((item) => {
      const rect = item.getBoundingClientRect()
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      )
    })
    .sort((left, right) => {
      const leftRect = left.getBoundingClientRect()
      const rightRect = right.getBoundingClientRect()
      return leftRect.width * leftRect.height - rightRect.width * rightRect.height
    })[0]
}

export function findLargestVisibleMedia<T extends RectSource>(
  media: T[],
  viewportWidth: number,
  viewportHeight: number
) {
  return media
    .map((item) => {
      return {
        item,
        visibleArea: getVisibleArea(item.getBoundingClientRect(), viewportWidth, viewportHeight),
      }
    })
    .filter(({ visibleArea }) => visibleArea > 0)
    .sort((left, right) => right.visibleArea - left.visibleArea)[0]?.item
}

export function getVisibleArea(rect: Rect, viewportWidth: number, viewportHeight: number) {
  const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0))
  const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0))
  return visibleWidth * visibleHeight
}

export function getMediaActionPosition(rect: Rect, options: MediaActionPositionOptions) {
  const maximumLeft = Math.max(
    options.inset,
    options.viewportWidth - options.actionWidth - options.inset
  )
  const maximumTop = Math.max(
    options.inset,
    options.viewportHeight - options.actionHeight - options.inset
  )

  return {
    left: Math.min(
      Math.max(rect.right - options.actionWidth - options.inset, options.inset),
      maximumLeft
    ),
    top: Math.min(Math.max(rect.top + options.inset, options.inset), maximumTop),
  }
}
