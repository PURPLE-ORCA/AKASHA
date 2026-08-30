import { GearIcon, SignOutIcon } from "@phosphor-icons/react"
import { Avatar, Button, Dropdown, Label } from "@heroui/react"

import type { DriveLibraryUser } from "@/server/drive/library.server"

type LibraryAccountMenuProps = {
  user?: DriveLibraryUser
}

export function LibraryAccountMenu({ user }: LibraryAccountMenuProps) {
  const fallback = getInitials(user)

  return (
    <>
      <Dropdown>
        <Button aria-label="Open account menu" isIconOnly variant="ghost">
          <Avatar size="sm">
            {user?.photoLink ? (
              <Avatar.Image
                alt={user.displayName ?? "Your Google profile"}
                src={user.photoLink}
              />
            ) : null}
            <Avatar.Fallback>{fallback}</Avatar.Fallback>
          </Avatar>
        </Button>
        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu
            aria-label="Account actions"
            disabledKeys={["settings"]}
            onAction={(key) => {
              if (key === "logout") {
                document
                  .querySelector<HTMLFormElement>("#logout-form")
                  ?.requestSubmit()
              }
            }}
          >
            <Dropdown.Item id="settings" textValue="Settings">
              <GearIcon aria-hidden="true" size={16} />
              <Label>Settings</Label>
            </Dropdown.Item>
            <Dropdown.Item id="logout" textValue="Log out" variant="danger">
              <SignOutIcon aria-hidden="true" size={16} />
              <Label>Log out</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      <form action="/api/auth/logout" id="logout-form" method="post" />
    </>
  )
}

function getInitials(user?: DriveLibraryUser) {
  const words = user?.displayName?.trim().split(/\s+/).filter(Boolean)

  if (words?.length) {
    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase()
  }

  return user?.emailAddress?.[0]?.toUpperCase() ?? "A"
}
