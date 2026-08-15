import { useEffect, useState } from "react"
import { PlusIcon, TrashIcon } from "@phosphor-icons/react"
import type { LibraryFolder } from "@stillroom/contracts"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type NewFolderDialogProps = {
  disabled: boolean
  parentName: string
  onCreate: (name: string) => Promise<void>
}

export function NewFolderDialog({
  disabled,
  parentName,
  onCreate,
}: NewFolderDialogProps) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string>()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    setIsPending(true)

    try {
      await onCreate(name)
      setName("")
      setIsOpen(false)
    } catch (caughtError) {
      setError(getActionError(caughtError))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button size="lg" disabled={disabled} />}>
        <PlusIcon data-icon="inline-start" aria-hidden="true" />
        New folder
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Create a folder</DialogTitle>
            <DialogDescription>
              Add a folder inside {parentName}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-5">
            <label className="grid gap-2 text-sm font-medium">
              Folder name
              <Input
                autoFocus
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
                placeholder="Campaign references"
                required
                value={name}
              />
            </label>
            {error ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              disabled={isPending || name.trim().length === 0}
              type="submit"
            >
              {isPending ? "Creating…" : "Create folder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type MoveItemsDialogProps = {
  folders: LibraryFolder[]
  itemCount: number
  open: boolean
  onMove: (folderId: string) => Promise<void>
  onOpenChange: (open: boolean) => void
}

export function MoveItemsDialog({
  folders,
  itemCount,
  open,
  onMove,
  onOpenChange,
}: MoveItemsDialogProps) {
  const [destinationId, setDestinationId] = useState<string | null>(null)
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!open) {
      setDestinationId(null)
      setError(undefined)
    }
  }, [open])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!destinationId) {
      return
    }

    setError(undefined)
    setIsPending(true)

    try {
      await onMove(destinationId)
      onOpenChange(false)
    } catch (caughtError) {
      setError(getActionError(caughtError))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Move {formatItemCount(itemCount)}</DialogTitle>
            <DialogDescription>
              Choose where this inspiration should live.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-5">
            <label className="text-sm font-medium" htmlFor="destination-folder">
              Destination
            </label>
            <Select value={destinationId} onValueChange={setDestinationId}>
              <SelectTrigger id="destination-folder">
                <SelectValue placeholder="Choose a folder" />
              </SelectTrigger>
              <SelectContent>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button disabled={!destinationId || isPending} type="submit">
              {isPending ? "Moving…" : "Move"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type RemoveItemsDialogProps = {
  itemCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onRemove: () => Promise<void>
}

export function RemoveItemsDialog({
  itemCount,
  open,
  onOpenChange,
  onRemove,
}: RemoveItemsDialogProps) {
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!open) {
      setError(undefined)
    }
  }, [open])

  async function remove() {
    setError(undefined)
    setIsPending(true)

    try {
      await onRemove()
      onOpenChange(false)
    } catch (caughtError) {
      setError(getActionError(caughtError))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TrashIcon aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>
            Remove {formatItemCount(itemCount)}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The selection will be moved to your Google Drive trash.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={remove}
            variant="destructive"
          >
            {isPending ? "Removing…" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function formatItemCount(count: number) {
  return `${count} ${count === 1 ? "item" : "items"}`
}

function getActionError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The action could not be completed."
}
