import { Fragment } from "react"
import {
  GridFourIcon,
  ListBulletsIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SidebarSimpleIcon,
} from "@phosphor-icons/react"
import type { FolderTreeNode } from "@stillroom/contracts"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { LibrarySidebar } from "./library-sidebar"

type LibraryToolbarProps = {
  folders: FolderTreeNode[]
  folderPath: string[]
  searchQuery: string
  selectedFolderId: string
  onSearchChange: (query: string) => void
}

export function LibraryToolbar({
  folders,
  folderPath,
  searchQuery,
  selectedFolderId,
  onSearchChange,
}: LibraryToolbarProps) {
  return (
    <header className="border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm md:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="lg:hidden">
          <Sheet>
            <Tooltip>
              <TooltipTrigger
                render={
                  <SheetTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon-lg"
                        aria-label="Open folders"
                      />
                    }
                  />
                }
              >
                <SidebarSimpleIcon aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>Open folders</TooltipContent>
            </Tooltip>
            <SheetContent side="left">
              <SheetTitle>Stillroom folders</SheetTitle>
              <LibrarySidebar
                folders={folders}
                selectedFolderId={selectedFolderId}
              />
            </SheetContent>
          </Sheet>
        </div>
        <div className="hidden min-w-0 flex-1 xl:block">
          <LibraryBreadcrumb folderPath={folderPath} />
        </div>
        <div className="w-full max-w-xl">
          <InputGroup>
            <InputGroupAddon>
              <MagnifyingGlassIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search your library"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search your library"
              type="search"
              value={searchQuery}
            />
          </InputGroup>
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="secondary"
                  size="icon-lg"
                  aria-label="Grid view"
                />
              }
            >
              <GridFourIcon aria-hidden="true" weight="fill" />
            </TooltipTrigger>
            <TooltipContent>Grid view</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon-lg" aria-label="List view" />
              }
            >
              <ListBulletsIcon aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>List view</TooltipContent>
          </Tooltip>
        </div>
        <Button size="lg">
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>
    </header>
  )
}

function LibraryBreadcrumb({ folderPath }: { folderPath: string[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {folderPath.map((folderName, index) => {
          const isCurrent = index === folderPath.length - 1

          return (
            <Fragment key={folderName}>
              <BreadcrumbItem>
                {isCurrent ? (
                  <BreadcrumbPage>{folderName}</BreadcrumbPage>
                ) : (
                  <span>{folderName}</span>
                )}
              </BreadcrumbItem>
              {isCurrent ? null : <BreadcrumbSeparator />}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
