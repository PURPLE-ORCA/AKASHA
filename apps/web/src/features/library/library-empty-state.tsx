import { useState } from "react"
import { FolderSimplePlusIcon } from "@phosphor-icons/react"
import { EmptyState } from "@heroui-pro/react"

import { NewFolderDialog } from "./library-action-dialogs"

type LibraryEmptyStateProps = {
  onCreateFolder: (name: string) => Promise<void>
}

export function LibraryEmptyState({ onCreateFolder }: LibraryEmptyStateProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="gallery-empty">
      <EmptyState>
        <EmptyState.Header>
          <EmptyState.Media variant="icon">
            <FolderSimplePlusIcon aria-hidden="true" />
          </EmptyState.Media>
          <EmptyState.Title>Create your first folder</EmptyState.Title>
          <EmptyState.Description>
            Give your collection a place to begin.
          </EmptyState.Description>
        </EmptyState.Header>
        <EmptyState.Content>
          <NewFolderDialog
            onCreate={onCreateFolder}
            onOpenChange={setIsOpen}
            open={isOpen}
            parentName="Akasha"
            triggerLabel="Create folder"
          />
        </EmptyState.Content>
      </EmptyState>
    </div>
  )
}
