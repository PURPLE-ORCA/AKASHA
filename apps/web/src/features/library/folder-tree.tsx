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
      <div className="grid min-h-[28rem] place-items-center">
        <Typography color="muted">No folders here yet.</Typography>
      </div>
    )
  }

  function moveFocus(index: number, direction: -1 | 1) {
    const nextIndex = (index + direction + folders.length) % folders.length
    linkRefs.current[nextIndex]?.focus()
  }

  return (
    <nav
      aria-label="Folders"
      className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,12rem),1fr))] gap-[clamp(2.5rem,5vw,4.5rem)_clamp(1.5rem,4vw,3.5rem)] p-[clamp(1.5rem,3vw,3rem)_clamp(0.25rem,1vw,1rem)] min-[52rem]:grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))]"
    >
      {folders.map((folder, index) => {
        const previews = previewsByFolder.get(folder.id) ?? []

        return (
          <Link
            className="group grid min-w-0 justify-items-center gap-4 text-center text-foreground no-underline focus-visible:outline-none"
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
            <span
              aria-hidden="true"
              className="relative isolate block aspect-[1.28] w-full max-w-[17rem] transition-transform duration-200 ease-out group-hover:-translate-y-1 after:pointer-events-none after:absolute after:-inset-2 after:z-10 after:rounded-3xl after:border-2 after:border-transparent after:transition-colors group-focus-visible:after:border-focus"
            >
              <span className="absolute inset-x-0 top-[15%] bottom-[14%] z-[1] rounded-t-2xl rounded-b-[1.25rem] bg-[color-mix(in_oklch,var(--accent)_78%,var(--background))] before:absolute before:-top-[13%] before:left-0 before:h-[24%] before:w-[43%] before:rounded-t-[0.9rem] before:bg-inherit" />
              <span className="absolute inset-x-0 top-[12%] bottom-[26%] z-[2] [perspective:50rem]">
                {previews.map((item, previewIndex) => (
                  <span
                    className={`absolute top-0 left-1/2 block aspect-[4/3] w-[43%] origin-bottom overflow-hidden rounded-[0.55rem] border-2 border-[color-mix(in_oklch,var(--foreground)_14%,transparent)] bg-surface transition-transform duration-200 ease-out ${getPreviewTransform(previewIndex, previews.length)}`}
                    key={item.id}
                  >
                    <img
                      alt=""
                      className="block h-full w-full object-cover"
                      decoding="async"
                      height={item.height}
                      loading="lazy"
                      src={item.thumbnailUrl}
                      width={item.width}
                    />
                  </span>
                ))}
              </span>
              <span className="absolute inset-x-0 top-[34%] bottom-[4%] z-[4] origin-bottom [transform:perspective(40rem)_rotateX(-3deg)] rounded-t-2xl rounded-b-[1.25rem] bg-gradient-to-b from-[color-mix(in_oklch,var(--accent)_96%,white)] via-[var(--accent)] to-[color-mix(in_oklch,var(--accent)_80%,black)] shadow-[inset_0_2px_color-mix(in_oklch,white_38%,transparent),0_0.6rem_1.25rem_color-mix(in_oklch,var(--accent)_14%,transparent)] transition-transform duration-200 ease-out group-hover:[transform:perspective(40rem)_rotateX(-8deg)_translateY(0.2rem)]" />
            </span>
            <span className="block max-w-full truncate">
              <Typography weight="medium">{folder.name}</Typography>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

function getPreviewTransform(index: number, total: number) {
  if (total === 1) {
    return "-translate-x-1/2 rotate-0 group-hover:-translate-y-2.5"
  }
  if (index === 0) {
    return "-translate-x-[88%] -rotate-8 group-hover:-translate-y-2.5 group-hover:-rotate-10"
  }
  if (index === 1) {
    return "-translate-x-1/2 -translate-y-[6%] rotate-1 group-hover:-translate-y-4 group-hover:rotate-1"
  }
  return "-translate-x-[12%] rotate-9 group-hover:-translate-y-2.5 group-hover:rotate-11"
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
