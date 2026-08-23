import { useMemo, useRef } from "react"
import { Typography } from "@heroui/react"
import { Link } from "@tanstack/react-router"
import type { LibraryFolder, LibraryItem } from "@akasha/contracts"

type FolderGalleryProps = {
  folders: LibraryFolder[]
  items: LibraryItem[]
  libraryFolders: LibraryFolder[]
}

const maximumFolderPreviews = 3

export function FolderGallery({
  folders,
  items,
  libraryFolders,
}: FolderGalleryProps) {
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const previewsByFolder = useMemo(
    () => getFolderPreviews(libraryFolders, items),
    [items, libraryFolders]
  )

  if (folders.length === 0) {
    return (
      <div className="gallery-empty">
        <Typography color="muted">No folders here yet.</Typography>
      </div>
    )
  }

  function moveFocus(index: number, direction: -1 | 1) {
    const nextIndex = (index + direction + folders.length) % folders.length
    linkRefs.current[nextIndex]?.focus()
  }

  return (
    <nav aria-label="Folders" className="folder-grid">
      {folders.map((folder, index) => {
        const previews = previewsByFolder.get(folder.id) ?? []

        return (
          <Link
            className="folder-link"
            key={folder.id}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault()
                moveFocus(index, -1)
              }
              if (event.key === "ArrowRight") {
                event.preventDefault()
                moveFocus(index, 1)
              }
              if (event.key === "ArrowUp") {
                event.preventDefault()
                event.currentTarget.click()
              }
              if (event.key === " ") {
                event.preventDefault()
                event.currentTarget.click()
              }
            }}
            ref={(node) => {
              linkRefs.current[index] = node
            }}
            search={(previous) => ({ ...previous, folder: folder.id })}
            to="/"
          >
            <span aria-hidden="true" className="folder-visual">
              <span className="folder-back" />
              <span className="folder-previews">
                {previews.map((item) => (
                  <span className="folder-preview" key={item.id}>
                    <img
                      alt=""
                      decoding="async"
                      height={item.height}
                      loading="lazy"
                      src={item.thumbnailUrl}
                      width={item.width}
                    />
                  </span>
                ))}
              </span>
              <span className="folder-front" />
            </span>
            <span className="folder-name">
              <Typography weight="medium">{folder.name}</Typography>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export function getFolderPreviews(
  folders: LibraryFolder[],
  items: LibraryItem[]
) {
  const childrenByFolder = new Map<string, string[]>()
  const mediaByFolder = new Map<string, LibraryItem[]>()

  for (const folder of folders) {
    if (!folder.parentId) continue
    const children = childrenByFolder.get(folder.parentId) ?? []
    children.push(folder.id)
    childrenByFolder.set(folder.parentId, children)
  }

  for (const item of items) {
    if (!item.thumbnailUrl) continue
    const media = mediaByFolder.get(item.folderId) ?? []
    media.push(item)
    mediaByFolder.set(item.folderId, media)
  }

  return new Map(
    folders.map((folder) => [
      folder.id,
      collectFolderPreviews(
        folder.id,
        childrenByFolder,
        mediaByFolder,
        new Set()
      ),
    ])
  )
}

function collectFolderPreviews(
  folderId: string,
  childrenByFolder: Map<string, string[]>,
  mediaByFolder: Map<string, LibraryItem[]>,
  visited: Set<string>
): LibraryItem[] {
  if (visited.has(folderId)) return []
  visited.add(folderId)

  const previews = (mediaByFolder.get(folderId) ?? []).slice(
    0,
    maximumFolderPreviews
  )

  for (const childId of childrenByFolder.get(folderId) ?? []) {
    if (previews.length >= maximumFolderPreviews) break
    previews.push(
      ...collectFolderPreviews(
        childId,
        childrenByFolder,
        mediaByFolder,
        visited
      ).slice(0, maximumFolderPreviews - previews.length)
    )
  }

  return previews
}
