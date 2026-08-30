import { useEffect, useState } from "react"
import {
  AlertDialog,
  Button,
  FieldError,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextField,
  Typography,
} from "@heroui/react"
import type { LibraryFolder } from "@akasha/contracts"

type NewFolderDialogProps = {
  open: boolean
  parentName: string
  onCreate: (name: string) => Promise<void>
  onOpenChange: (open: boolean) => void
  triggerLabel?: string
}

export function NewFolderDialog({
  open,
  parentName,
  onCreate,
  onOpenChange,
  triggerLabel,
}: NewFolderDialogProps) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!open) {
      setName("")
      setError(undefined)
    }
  }, [open])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim().length === 0) {
      setError("Enter a folder name.")
      return
    }

    setError(undefined)
    setIsPending(true)
    try {
      await onCreate(name)
      onOpenChange(false)
    } catch (caughtError) {
      setError(getActionError(caughtError))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      {triggerLabel ? (
        <Button onPress={() => onOpenChange(true)}>{triggerLabel}</Button>
      ) : null}
      <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange}>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <form className="grid gap-4" onSubmit={submit}>
              <Modal.Header>
                <Modal.Heading>Create a folder</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <div className="grid gap-4">
                  <Typography color="muted" type="body-sm">
                    Add a folder inside {parentName}.
                  </Typography>
                  <TextField fullWidth isInvalid={Boolean(error)}>
                    <Label>Folder name</Label>
                    <Input
                      autoFocus
                      maxLength={120}
                      placeholder="Campaign references"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                    <FieldError>{error}</FieldError>
                  </TextField>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <div className="flex justify-end gap-3">
                  <Button slot="close" type="button" variant="tertiary">
                    Cancel
                  </Button>
                  <Button isPending={isPending} type="submit">
                    {isPending ? "Creating…" : "Create folder"}
                  </Button>
                </div>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
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
      setError("Choose a destination folder.")
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
    <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <form className="grid gap-4" onSubmit={submit}>
            <Modal.Header>
              <Modal.Heading>Move {formatItemCount(itemCount)}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="grid gap-4">
                <Select
                  fullWidth
                  placeholder="Choose a folder"
                  selectedKey={destinationId}
                  onSelectionChange={(key) => setDestinationId(String(key))}
                >
                  <Label>Destination</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {folders.map((folder) => (
                        <ListBox.Item
                          id={folder.id}
                          key={folder.id}
                          textValue={folder.name}
                        >
                          {folder.name}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                {error ? (
                  <Typography color="muted" role="alert" type="body-sm">
                    {error}
                  </Typography>
                ) : null}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <div className="flex justify-end gap-3">
                <Button slot="close" type="button" variant="tertiary">
                  Cancel
                </Button>
                <Button isPending={isPending} type="submit">
                  {isPending
                    ? "Moving…"
                    : `Move ${itemCount === 1 ? "asset" : "assets"}`}
                </Button>
              </div>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
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
    if (!open) setError(undefined)
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
    <AlertDialog.Backdrop isOpen={open} onOpenChange={onOpenChange}>
      <AlertDialog.Container size="sm">
        <AlertDialog.Dialog>
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header>
            <AlertDialog.Icon status="danger" />
            <AlertDialog.Heading>
              Delete {formatItemCount(itemCount)}?
            </AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <Typography color="muted">
              {itemCount === 1
                ? "The asset will be moved to trash."
                : "The assets will be moved to trash."}
            </Typography>
            {error ? (
              <Typography color="muted" role="alert" type="body-sm">
                {error}
              </Typography>
            ) : null}
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <div className="flex justify-end gap-3">
              <Button slot="close" variant="tertiary">
                Cancel
              </Button>
              <Button isPending={isPending} variant="danger" onPress={remove}>
                {isPending
                  ? "Deleting…"
                  : `Delete ${itemCount === 1 ? "asset" : "assets"}`}
              </Button>
            </div>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  )
}

function formatItemCount(count: number) {
  return `${count} ${count === 1 ? "asset" : "assets"}`
}

function getActionError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to complete the action. Try again."
}
