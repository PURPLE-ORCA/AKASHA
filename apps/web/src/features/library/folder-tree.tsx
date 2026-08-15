import {
  CaretDownIcon,
  CaretRightIcon,
  FolderIcon,
  FolderOpenIcon,
} from "@phosphor-icons/react"
import type { FolderTreeNode } from "@stillroom/contracts"

type FolderTreeProps = {
  folders: FolderTreeNode[]
  selectedFolderId: string
}

export function FolderTree({ folders, selectedFolderId }: FolderTreeProps) {
  return (
    <nav aria-label="Library folders">
      <ul className="space-y-1">
        {folders.map((folder) => (
          <FolderBranch
            folder={folder}
            key={folder.id}
            selectedFolderId={selectedFolderId}
          />
        ))}
      </ul>
    </nav>
  )
}

type FolderBranchProps = {
  folder: FolderTreeNode
  selectedFolderId: string
}

function FolderBranch({ folder, selectedFolderId }: FolderBranchProps) {
  const isSelected = folder.id === selectedFolderId
  const isExpanded = folder.children.length > 0

  return (
    <li>
      <a
        aria-current={isSelected ? "page" : undefined}
        className="group flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-primary/10 aria-[current=page]:font-medium aria-[current=page]:text-primary"
        href={`/?folder=${folder.id}`}
      >
        {isExpanded ? (
          <CaretDownIcon aria-hidden="true" className="size-3" />
        ) : (
          <CaretRightIcon aria-hidden="true" className="size-3 opacity-0" />
        )}
        {isSelected ? (
          <FolderOpenIcon aria-hidden="true" className="size-4" weight="fill" />
        ) : (
          <FolderIcon aria-hidden="true" className="size-4" />
        )}
        <span className="truncate">{folder.name}</span>
      </a>
      {isExpanded ? (
        <ul className="ml-5 space-y-1 border-l border-border pl-2">
          {folder.children.map((child) => (
            <FolderBranch
              folder={child}
              key={child.id}
              selectedFolderId={selectedFolderId}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
