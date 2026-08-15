import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"

import { TooltipProvider } from "@/components/ui/tooltip"
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
        title: "Stillroom — Your visual library",
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
    <main className="grid min-h-svh place-items-center bg-background px-6 text-center">
      <div>
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          This room is empty
        </h1>
        <p className="mt-3 text-muted-foreground">
          The page you requested could not be found.
        </p>
        <a
          className="mt-6 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          href="/"
        >
          Return to your library
        </a>
      </div>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <a
          className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
          href="#main-content"
        >
          Skip to content
        </a>
        <TooltipProvider>{children}</TooltipProvider>
        <Scripts />
      </body>
    </html>
  )
}
