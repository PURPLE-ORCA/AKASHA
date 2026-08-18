import { GoogleLogoIcon } from "@phosphor-icons/react"
import { Button, Typography } from "@heroui/react"

import { AkashaBrand } from "@/components/stillroom/brand"

type AuthLandingProps = {
  connectionFailed?: boolean
}

export function AuthLanding({ connectionFailed = false }: AuthLandingProps) {
  return (
    <main className="auth-shell" id="main-content">
      <section className="auth-panel">
        <AkashaBrand />
        <Typography type="h1">Keep the ideas worth returning to.</Typography>
        <Typography color="muted">
          Collect images and visual references in one calm, private space.
        </Typography>
        <form action="/api/auth/google" method="get">
          <Button size="lg" type="submit">
            <GoogleLogoIcon aria-hidden="true" weight="bold" />
            Continue with Google
          </Button>
        </form>
        {connectionFailed ? (
          <Typography color="muted" role="alert" type="body-sm">
            Akasha couldn’t connect your library. Try again.
          </Typography>
        ) : null}
      </section>
    </main>
  )
}
