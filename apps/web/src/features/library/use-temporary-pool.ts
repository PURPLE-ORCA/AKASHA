import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { toast } from "@heroui/react"

export function useTemporaryPool(rootFolderId: string) {
  const storageWarningShown = useRef(false)
  const storageKey = `akasha:temporary-pool:${rootFolderId}`
  const [pool, setPool] = useState<{ key: string; ids: string[] | null }>({
    key: "",
    ids: null,
  })
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    let ids: string[] | null = null
    try {
      const saved: unknown = JSON.parse(
        sessionStorage.getItem(storageKey) ?? "null"
      )
      if (Array.isArray(saved) && saved.every((id) => typeof id === "string")) {
        ids = [...new Set(saved)]
      }
    } catch {
      // Storage may be unavailable; the pool still works for this page visit.
    }
    setPool({ key: storageKey, ids })
    setIsOpen(ids !== null)
  }, [storageKey])

  useEffect(() => {
    if (pool.key !== storageKey) return
    try {
      if (pool.ids === null) sessionStorage.removeItem(storageKey)
      else sessionStorage.setItem(storageKey, JSON.stringify(pool.ids))
    } catch {
      if (pool.ids !== null && !storageWarningShown.current) {
        storageWarningShown.current = true
        toast.warning("Pool will clear when you leave this page", {
          description: "Your browser could not save this temporary pool.",
        })
      }
    }
  }, [pool, storageKey])

  const toggleItem = useCallback((id: string) => {
    setIsOpen(true)
    setPool((current) => ({
      ...current,
      ids: current.ids?.includes(id)
        ? current.ids.filter((itemId) => itemId !== id)
        : [...(current.ids ?? []), id],
    }))
  }, [])
  const addItems = useCallback((ids: string[]) => {
    setPool((current) => ({
      ...current,
      ids: [...new Set([...(current.ids ?? []), ...ids])],
    }))
    setIsOpen(true)
  }, [])
  const itemIds = useMemo(
    () => new Set(pool.key === storageKey ? (pool.ids ?? []) : []),
    [pool, storageKey]
  )

  return {
    itemIds,
    isActive: pool.key === storageKey && pool.ids !== null,
    isOpen: pool.key === storageKey && isOpen,
    toggleItem,
    addItems,
    toggleOpen() {
      setPool((current) => ({ key: storageKey, ids: current.ids ?? [] }))
      setIsOpen((open) => !open)
    },
    close() {
      setIsOpen(false)
    },
    dismiss() {
      setPool({ key: storageKey, ids: null })
      setIsOpen(false)
    },
  }
}
