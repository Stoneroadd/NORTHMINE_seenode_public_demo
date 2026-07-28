import { useCallback, useMemo, useState } from 'react'
import { cleanAnalysisFilters } from '../lib/queryParams'
import type { AnalysisFilterKey, AnalysisFilters } from '../components/filters/filterTypes'

function readStoredFilters(storageKey?: string): AnalysisFilters {
  if (!storageKey || typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || '{}') as AnalysisFilters
  } catch {
    return {}
  }
}

function persistFilters(storageKey: string | undefined, filters: AnalysisFilters) {
  if (!storageKey || typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(filters))
}

export function useAnalysisFilters(initialFilters: AnalysisFilters = {}, storageKey?: string) {
  const initial = useMemo(() => ({ ...initialFilters, ...readStoredFilters(storageKey) }), [initialFilters, storageKey])
  const [draftFilters, setDraftFilters] = useState<AnalysisFilters>(initial)
  const [appliedFilters, setAppliedFilters] = useState<AnalysisFilters>(() => cleanAnalysisFilters(initial))

  const activeCount = useMemo(() => Object.keys(cleanAnalysisFilters(appliedFilters)).length, [appliedFilters])
  const draftActiveCount = useMemo(() => Object.keys(cleanAnalysisFilters(draftFilters)).length, [draftFilters])

  const setFilter = useCallback((key: AnalysisFilterKey, value: string) => {
    setDraftFilters((current) => ({ ...current, [key]: value }))
  }, [])

  const applyFilters = useCallback(() => {
    const next = cleanAnalysisFilters(draftFilters)
    setAppliedFilters(next)
    persistFilters(storageKey, next)
  }, [draftFilters, storageKey])

  const clearFilters = useCallback(() => {
    setDraftFilters({})
    setAppliedFilters({})
    persistFilters(storageKey, {})
  }, [storageKey])

  const removeFilter = useCallback((key: AnalysisFilterKey) => {
    setDraftFilters((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setAppliedFilters((current) => {
      const next = { ...current }
      delete next[key]
      persistFilters(storageKey, next)
      return next
    })
  }, [storageKey])

  return {
    draftFilters,
    appliedFilters,
    activeCount,
    draftActiveCount,
    setFilter,
    applyFilters,
    clearFilters,
    removeFilter,
  }
}
