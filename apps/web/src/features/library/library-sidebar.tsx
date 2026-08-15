import { PlusIcon } from "@phosphor-icons/react"
import type { FolderTreeNode } from "@stillroom/contracts"

import { StillroomBrand } from "@/components/stillroom/brand"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { FolderTree } from "./folder-tree"

type LibrarySidebarProps = {
  folders: FolderTreeNode[]
  isConnected: boolean
  selectedFolderId: string
}

export function LibrarySidebar({
  folders,
  isConnected,
  selectedFolderId,
}: LibrarySidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar px-4 py-5 text-sidebar-foreground">
      <StillroomBrand />
      <div className="mt-8">
        <Button size="lg">
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          New folder
        </Button>
      </div>
      <div className="my-5">
        <Separator />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <FolderTree folders={folders} selectedFolderId={selectedFolderId} />
      </div>
      <div className="pt-5">
        {isConnected ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="size-2 rounded-full bg-primary"
              aria-hidden="true"
            />
            Library connected
          </p>
        ) : (
          <Button
            render={<a href="/api/auth/google" />}
            size="lg"
            variant="outline"
          >
            Connect library
          </Button>
        )}
      </div>
    </div>
  )
}
