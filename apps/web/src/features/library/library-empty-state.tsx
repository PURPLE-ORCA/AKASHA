import { FolderSimplePlusIcon } from "@phosphor-icons/react"

import { NewFolderDialog } from "./library-action-dialogs"

type LibraryEmptyStateProps = {
  onCreateFolder: (name: string) => Promise<void>
}

export function LibraryEmptyState({ onCreateFolder }: LibraryEmptyStateProps) {
  return (
    <section className="grid min-h-[32rem] place-items-center rounded-2xl border border-dashed border-border bg-muted/25 px-6 py-16 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <FolderSimplePlusIcon
            aria-hidden="true"
            className="size-7"
            weight="duotone"
          />
        </span>
        <h2 className="mt-6 text-2xl font-semibold tracking-tight">
          Make this space yours
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Start with a folder for the ideas, references, or projects you want to
          keep close.
        </p>
        <div className="mt-7 flex justify-center">
          <NewFolderDialog
            disabled={false}
            onCreate={onCreateFolder}
            parentName="Stillroom"
            triggerLabel="Create your first folder"
          />
        </div>
      </div>
    </section>
  )
}
