import { ListBox, SearchField, Select } from "@heroui/react"

import type { LibrarySortOrder } from "./library-items"

type LibrarySearchControlsProps = {
  onSearchQueryChange: (query: string) => void
  onSortOrderChange: (sortOrder: LibrarySortOrder) => void
  searchQuery: string
  sortOrder: LibrarySortOrder
}

export function LibrarySearchControls({
  onSearchQueryChange,
  onSortOrderChange,
  searchQuery,
  sortOrder,
}: LibrarySearchControlsProps) {
  return (
    <div className="flex w-full min-w-0 items-center gap-2 min-[52rem]:w-auto">
      <div className="min-w-0 flex-1 min-[52rem]:w-60 min-[52rem]:flex-none">
        <SearchField
          aria-label="Search library"
          fullWidth
          value={searchQuery}
          variant="secondary"
          onChange={onSearchQueryChange}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search library" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </div>
      <div className="w-36 flex-none">
        <Select
          aria-label="Sort media"
          fullWidth
          selectedKey={sortOrder}
          onSelectionChange={(key) =>
            onSortOrderChange(String(key) as LibrarySortOrder)
          }
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="newest" textValue="Newest">
                Newest
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="oldest" textValue="Oldest">
                Oldest
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="title" textValue="Title">
                Title
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
    </div>
  )
}
