import { ApertureIcon } from "@phosphor-icons/react"
import { Typography } from "@heroui/react"

type AkashaBrandProps = {
  className?: string
  showIcon?: boolean
}

export function AkashaBrand({ className, showIcon = true }: AkashaBrandProps) {
  return (
    <div
      className={`flex items-center gap-3 font-heading ${className ?? "text-accent"}`}
    >
      {showIcon ? <ApertureIcon aria-hidden="true" size={28} /> : null}
      <Typography className="text-inherit" type="h4">
        AKASHA
      </Typography>
    </div>
  )
}
