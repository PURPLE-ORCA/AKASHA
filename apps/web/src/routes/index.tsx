import {
  Await,
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
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
  const navigate = useNavigate({ from: "/" })
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
            onFolderNavigate={(folderId) => {
              void navigate({
                search: (previous) => ({ ...previous, folder: folderId }),
                to: "/",
              })
            }}
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
    <div
      aria-hidden="true"
      className="h-svh min-h-svh overflow-hidden bg-background"
    >
      <header className="sticky top-0 z-20 flex min-h-[4.5rem] flex-col items-start justify-between gap-4 bg-[color-mix(in_oklch,var(--background)_92%,transparent)] px-[clamp(1rem,2vw,2rem)] py-4 backdrop-blur-md min-[52rem]:flex-row min-[52rem]:items-center">
        <div className="text-sm font-semibold">Akasha</div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 rounded-xl bg-default p-1">
            <span className="h-8 w-14 rounded-lg bg-surface" />
            <span className="h-8 w-14 rounded-lg bg-surface" />
          </div>
          <div className="flex gap-1 rounded-xl bg-default p-1">
            <span className="size-8 rounded-lg bg-surface" />
            <span className="size-8 rounded-lg bg-surface" />
            <span className="size-8 rounded-lg bg-surface" />
          </div>
          <div className="size-8 rounded-full bg-default" />
        </div>
      </header>
      <main className="w-full px-[clamp(0.75rem,1.5vw,1.5rem)] pt-4 pb-12">
        <div className="columns-1 gap-4 sm:columns-2 min-[56rem]:columns-3 min-[76rem]:columns-4 min-[100rem]:columns-5">
          {Array.from({ length: 16 }, (_, index) => (
            <div className="mb-4 break-inside-avoid" key={index}>
              <div
                className="min-h-40 w-full rounded-2xl bg-default"
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
