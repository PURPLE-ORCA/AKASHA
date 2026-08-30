import { ApertureIcon } from "@phosphor-icons/react"
import { Typography } from "@heroui/react"

export function AkashaBrand() {
  return (
    <div className="flex items-center gap-3 font-heading text-accent">
      <ApertureIcon aria-hidden="true" size={28} />
      <Typography type="h4">Akasha</Typography>
    </div>
  )
}
