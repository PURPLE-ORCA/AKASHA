import { useRef } from "react"
import { FolderSimpleIcon } from "@phosphor-icons/react"
import { Typography } from "@heroui/react"
import { Link } from "@tanstack/react-router"
import type { LibraryFolder } from "@stillroom/contracts"

type FolderGalleryProps = {
  folders: LibraryFolder[]
}

export function FolderGallery({ folders }: FolderGalleryProps) {
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([])

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
            <FolderSimpleIcon aria-hidden="true" size={24} weight="fill" />
            <Typography weight="medium">{folder.name}</Typography>
          </Link>
        )
      })}
    </nav>
  )
}
