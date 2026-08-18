import { QuestionIcon } from "@phosphor-icons/react"
import { Button, Kbd, Typography } from "@heroui/react"
import { HoverCard } from "@heroui-pro/react"

export function LibraryShortcuts() {
  return (
    <HoverCard closeDelay={120} openDelay={180}>
      <HoverCard.Trigger>
        <Button
          aria-label="Keyboard shortcuts"
          isIconOnly
          size="sm"
          variant="tertiary"
        >
          <QuestionIcon aria-hidden="true" size={16} weight="bold" />
        </Button>
      </HoverCard.Trigger>
      <HoverCard.Content placement="bottom end">
        <div className="shortcut-menu">
          <Typography type="h6">Keyboard shortcuts</Typography>
          <dl className="shortcut-list">
            <Shortcut label="Command palette">
              <Kbd>
                <Kbd.Abbr keyValue="command" />
                <Kbd.Content>K</Kbd.Content>
              </Kbd>
            </Shortcut>
            <Shortcut label="Switch theme">
              <Kbd>
                <Kbd.Content>D</Kbd.Content>
              </Kbd>
            </Shortcut>
            <Shortcut label="Switch library view">
              <Kbd>
                <Kbd.Content>S</Kbd.Content>
              </Kbd>
            </Shortcut>
            <Shortcut label="Move through folders or images">
              <span className="shortcut-keys">
                <Kbd>
                  <Kbd.Abbr keyValue="left" />
                </Kbd>
                <Kbd>
                  <Kbd.Abbr keyValue="right" />
                </Kbd>
              </span>
            </Shortcut>
            <Shortcut label="Open folder">
              <span className="shortcut-keys">
                <Kbd>
                  <Kbd.Abbr keyValue="space" />
                </Kbd>
                <Typography color="muted" type="body-sm">
                  or
                </Typography>
                <Kbd>
                  <Kbd.Abbr keyValue="enter" />
                </Kbd>
              </span>
            </Shortcut>
          </dl>
        </div>
      </HoverCard.Content>
    </HoverCard>
  )
}

function Shortcut({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <div className="shortcut-row">
      <dt>
        <Typography color="muted" type="body-sm">
          {label}
        </Typography>
      </dt>
      <dd>{children}</dd>
    </div>
  )
}
