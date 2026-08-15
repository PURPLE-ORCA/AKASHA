import { createFileRoute, useRouter } from "@tanstack/react-router"
import { z } from "zod"

import { AuthLanding } from "@/features/auth/auth-landing"
import { getLibrarySnapshot } from "@/features/library/library.functions"
import { LibraryPage } from "@/features/library/library-page"

export const Route = createFileRoute("/")({
  component: LibraryRoute,
  loader: () => getLibrarySnapshot(),
  validateSearch: z.object({
    connection: z.enum(["connected", "failed"]).optional(),
    folder: z.string().optional(),
  }),
})

function LibraryRoute() {
  const router = useRouter()
  const libraryState = Route.useLoaderData()
  const { connection, folder } = Route.useSearch()

  if (libraryState.status === "disconnected") {
    return <AuthLanding connectionFailed={connection === "failed"} />
  }

  return (
    <LibraryPage
      initialSnapshot={libraryState.snapshot}
      onRefresh={() => router.invalidate()}
      requestedFolderId={folder}
    />
  )
}
