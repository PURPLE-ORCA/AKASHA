import { createFileRoute, useRouter } from "@tanstack/react-router"
import { z } from "zod"

import { getLibrarySnapshot } from "@/features/library/library.functions"
import { LibraryPage } from "@/features/library/library-page"

export const Route = createFileRoute("/")({
  component: LibraryRoute,
  loader: () => getLibrarySnapshot(),
  validateSearch: z.object({ folder: z.string().optional() }),
})

function LibraryRoute() {
  const router = useRouter()
  const libraryState = Route.useLoaderData()
  const { folder } = Route.useSearch()

  return (
    <LibraryPage
      initialSnapshot={
        libraryState.status === "connected" ? libraryState.snapshot : undefined
      }
      isConnected={libraryState.status === "connected"}
      onRefresh={() => router.invalidate()}
      requestedFolderId={folder}
    />
  )
}
