import { Await, createFileRoute, useRouter } from "@tanstack/react-router"
import { BoneSuspense } from "boneyard-js/react"
import { z } from "zod"

import { AuthLanding } from "@/features/auth/auth-landing"
import { getLibrarySnapshot } from "@/features/library/library.functions"
import { LibraryPage } from "@/features/library/library-page"
import "@/bones/registry"

export const Route = createFileRoute("/")({
  component: LibraryRoute,
  loaderDeps: () => ({}),
  loader: () => ({ libraryState: getLibrarySnapshot() }),
  staleTime: 30_000,
  validateSearch: z.object({
    __bones: z.literal("library").optional(),
    connection: z.enum(["connected", "failed"]).optional(),
    folder: z.string().optional(),
  }),
})

function LibraryRoute() {
  const router = useRouter()
  const { libraryState } = Route.useLoaderData()
  const { __bones, connection, folder } = Route.useSearch()
  const content = (
    <Await promise={libraryState}>
      {(resolvedLibraryState) =>
        resolvedLibraryState.status === "disconnected" ? (
          <AuthLanding connectionFailed={connection === "failed"} />
        ) : (
          <LibraryPage
            initialSnapshot={resolvedLibraryState.snapshot}
            onRefresh={() => router.invalidate()}
            requestedFolderId={folder}
          />
        )
      }
    </Await>
  )

  if (__bones === "library") {
    return (
      <div data-boneyard="library-shell" style={{ position: "relative" }}>
        <LibraryLoadingFixture />
      </div>
    )
  }

  return (
    <BoneSuspense
      animate="pulse"
      color="#eeeaf5"
      darkColor="#302c38"
      fallback={<LibraryLoadingFixture />}
      fixture={<LibraryLoadingFixture />}
      name="library-shell"
      select="viewport"
      transition={180}
    >
      {content}
    </BoneSuspense>
  )
}

function LibraryLoadingFixture() {
  const aspectRatios = ["4 / 5", "3 / 2", "1 / 1", "2 / 3", "5 / 4", "3 / 4"]

  return (
    <div aria-hidden="true" className="library-shell library-loading-shell">
      <header className="library-header">
        <div className="library-loading-crumb">Stillroom</div>
        <div className="library-loading-theme">
          <span />
          <span />
          <span />
        </div>
      </header>
      <main className="library-main">
        <div className="library-loading-tabs">
          <span>All</span>
          <span>Folders</span>
        </div>
        <div className="media-grid">
          {Array.from({ length: 16 }, (_, index) => (
            <div className="media-unit" key={index}>
              <div
                className="library-loading-image"
                style={{
                  aspectRatio: aspectRatios[index % aspectRatios.length],
                }}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
