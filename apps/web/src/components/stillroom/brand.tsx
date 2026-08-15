import { ArchiveBoxIcon } from "@phosphor-icons/react"

export function StillroomBrand() {
  return (
    <a
      className="inline-flex items-center gap-3"
      href="/"
      aria-label="Stillroom home"
    >
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <ArchiveBoxIcon aria-hidden="true" weight="bold" />
      </span>
      <span className="font-heading text-lg font-semibold tracking-tight">
        Stillroom
      </span>
    </a>
  )
}
