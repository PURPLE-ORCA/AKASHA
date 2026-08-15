import { createFileRoute } from "@tanstack/react-router"

import { getLibrarySnapshot } from "@/features/library/library.functions"
import { LibraryPage } from "@/features/library/library-page"

export const Route = createFileRoute("/")({
  component: LibraryRoute,
  loader: () => getLibrarySnapshot(),
})

function LibraryRoute() {
  const libraryState = Route.useLoaderData()

  return (
    <LibraryPage
      initialSnapshot={
        libraryState.status === "connected" ? libraryState.snapshot : undefined
      }
      isConnected={libraryState.status === "connected"}
    />
  )
}
