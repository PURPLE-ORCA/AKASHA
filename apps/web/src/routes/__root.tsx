import {
  HeadContent,
  Scripts,
  createRootRoute,
  useNavigate,
} from "@tanstack/react-router"
import { Link, Toast, Typography } from "@heroui/react"
import { RouterProvider } from "react-aria-components"

import { themeBootstrapScript } from "@/features/theme/theme"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Akasha — Your visual library",
      },
      {
        name: "description",
        content: "Capture and organize the visual ideas you want to keep.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="grid min-h-dvh place-items-center p-8 text-center">
      <div className="grid w-full max-w-[44rem] justify-items-center gap-6">
        <Typography color="muted" type="body-sm">
          404
        </Typography>
        <Typography type="h1">This room is empty</Typography>
        <Typography color="muted">
          The page you requested could not be found.
        </Typography>
        <Link href="/">Return to your library</Link>
      </div>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <HeadContent />
      </head>
      <body>
        <RouterProvider navigate={(href) => navigate({ href })}>
          <a
            className="fixed top-4 -left-[999rem] z-50 focus:left-4"
            href="#main-content"
          >
            Skip to content
          </a>
          {children}
          <Toast.Provider placement="bottom end" />
        </RouterProvider>
        <Scripts />
      </body>
    </html>
  )
}
