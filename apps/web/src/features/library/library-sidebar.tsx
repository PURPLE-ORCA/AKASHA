import type { FolderTreeNode } from "@stillroom/contracts"

import { StillroomBrand } from "@/components/stillroom/brand"
import { Separator } from "@/components/ui/separator"
import { FolderTree } from "./folder-tree"
import { NewFolderDialog } from "./library-action-dialogs"

type LibrarySidebarProps = {
  folders: FolderTreeNode[]
  onCreateFolder: (name: string) => Promise<void>
  selectedFolderId: string
  selectedFolderName: string
}

export function LibrarySidebar({
  folders,
  onCreateFolder,
  selectedFolderId,
  selectedFolderName,
}: LibrarySidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar px-4 py-5 text-sidebar-foreground">
      <StillroomBrand />
      <div className="mt-8">
        <NewFolderDialog
          disabled={false}
          onCreate={onCreateFolder}
          parentName={selectedFolderName}
        />
      </div>
      <div className="my-5">
        <Separator />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <FolderTree folders={folders} selectedFolderId={selectedFolderId} />
      </div>
      <div className="pt-5">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          Library connected
        </p>
      </div>
    </div>
  )
}
