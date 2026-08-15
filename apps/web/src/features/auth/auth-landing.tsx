import { GoogleLogoIcon, LockKeyIcon } from "@phosphor-icons/react"

import { StillroomBrand } from "@/components/stillroom/brand"
import { Button } from "@/components/ui/button"

type AuthLandingProps = {
  connectionFailed?: boolean
}

export function AuthLanding({ connectionFailed = false }: AuthLandingProps) {
  return (
    <main
      className="relative isolate grid min-h-svh overflow-hidden bg-background"
      id="main-content"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-primary/10 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute top-20 left-1/2 -z-10 size-[28rem] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl md:size-[40rem]"
      />

      <div className="flex min-h-svh flex-col px-5 py-5 sm:px-8 sm:py-7">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <StillroomBrand />
          <p className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <LockKeyIcon aria-hidden="true" />
            Private by design
          </p>
        </header>

        <section className="mx-auto grid w-full max-w-3xl flex-1 place-items-center py-16 text-center">
          <div>
            <p className="font-heading text-sm font-semibold tracking-[0.18em] text-primary uppercase">
              Your private visual library
            </p>
            <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl lg:text-7xl">
              Keep the ideas worth returning to.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg sm:leading-8">
              Collect images and visual references in one calm, searchable space
              that stays connected to your Google Drive.
            </p>

            <div className="mt-9 flex justify-center">
              <Button
                nativeButton={false}
                render={<a href="/api/auth/google" />}
                size="lg"
              >
                <GoogleLogoIcon aria-hidden="true" weight="bold" />
                Continue with Google
              </Button>
            </div>

            {connectionFailed ? (
              <p
                className="mx-auto mt-5 max-w-md text-sm text-destructive"
                role="alert"
              >
                Stillroom couldn’t connect your library. Please try again.
              </p>
            ) : null}

            <p className="mt-5 text-sm text-muted-foreground">
              Your collection stays in your Google Drive.
            </p>
          </div>
        </section>

        <footer className="mx-auto flex w-full max-w-6xl justify-center border-t border-border pt-5 text-center text-xs text-muted-foreground sm:justify-between sm:text-left">
          <p>Stillroom</p>
          <p className="hidden sm:block">
            A quieter place for visual thinking.
          </p>
        </footer>
      </div>
    </main>
  )
}
