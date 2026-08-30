import { GoogleLogoIcon } from "@phosphor-icons/react"
import { Button, Typography } from "@heroui/react"
import { AkashaBrand } from "@/components/stillroom/brand"

type AuthLandingProps = {
  connectionFailed?: boolean
}

export function AuthLanding({ connectionFailed = false }: AuthLandingProps) {
  return (
    <main
      className="flex min-h-dvh flex-col items-center overflow-x-clip bg-background px-4 pt-5 text-foreground sm:px-6 sm:pt-8 md:px-10 md:pt-10"
      id="main-content"
    >
      <section className="mb-10 flex w-full max-w-208 flex-col items-center gap-5 text-center sm:mb-14 md:mb-18">
        <AkashaBrand />
        <Typography type="h1">Keep the ideas worth returning to.</Typography>
        <Typography color="muted">
          Collect images and visual references in one calm, private space.
        </Typography>
        <form action="/api/auth/google" className="mt-2" method="get">
          <Button size="lg" type="submit">
            <GoogleLogoIcon aria-hidden="true" weight="bold" />
            Continue with Google
          </Button>
        </form>
        {connectionFailed ? (
          <div className="mt-2">
            <Typography
              align="center"
              color="muted"
              role="alert"
              type="body-sm"
            >
              Akasha couldn’t connect your library. Try again.
            </Typography>
          </div>
        ) : null}
      </section>

      <section
        aria-label="Product preview"
        className="relative mx-auto w-full max-w-360"
      >
        <div className="relative w-full overflow-hidden rounded-t-[clamp(1.5rem,3.5vw,2.75rem)] border border-b-0 border-border bg-[color-mix(in_oklch,var(--accent)_6%,var(--surface))] shadow-[-12px_40px_-15px_color-mix(in_oklch,var(--foreground)_6%,transparent)] dark:border-[color-mix(in_oklch,var(--border)_60%,transparent)] dark:bg-[color-mix(in_oklch,var(--accent)_12%,var(--background))]">
          <img
            alt="Engraved illustration of the grand reading room"
            className="pointer-events-none block aspect-1562/1007 h-auto w-full object-cover object-top select-none"
            decoding="async"
            fetchPriority="high"
            src="/landing/grand-reading-room.webp"
          />
          <div className="absolute top-[8%] overflow-hidden rounded-md border border-[color-mix(in_oklch,var(--foreground)_12%,transparent)] shadow-2xl transition-transform duration-200 sm:top-[45%] sm:left-[8%] sm:w-[84%] md:top-[52%] md:left-[19%] md:w-[62%] md:rounded-[clamp(0.75rem,1.5vw,1.25rem)] dark:border-[color-mix(in_oklch,white_14%,transparent)]">
            <img
              alt="Akasha visual library workspace in light mode"
              className="block h-auto w-full select-none dark:hidden"
              decoding="async"
              src="/landing/app-screenshot-light.webp"
            />
            <img
              alt="Akasha visual library workspace in dark mode"
              className="hidden h-auto w-full select-none dark:block"
              decoding="async"
              src="/landing/app-screenshot-dark.webp"
            />
          </div>
        </div>
      </section>
    </main>
  )
}
