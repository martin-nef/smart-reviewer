import { useEffect, useState, useCallback } from 'react'
import { apiGet } from '../api'
import { useDebounce } from '../hooks/useDebounce'
import SearchNewsItem from '../components/SearchNewsItem'
import Toast from '../components/Toast'
import type { NewsItem } from '../types'

type Status = 'idle' | 'loading' | 'done' | 'error'

export default function SearchNews() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NewsItem[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [toast, setToast] = useState<string | null>(null)

  const debouncedQuery = useDebounce(query, 300)

  const showToast = useCallback((msg: string) => setToast(msg), [])

  useEffect(() => {
    const q = debouncedQuery.trim()
    if (!q) {
      // TODO: use a library for debouncing to avoid state in effect 
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([])
      setStatus('idle')
      return
    }

    let cancelled = false
    setStatus('loading')

    apiGet<NewsItem[]>(`/search_news?query=${encodeURIComponent(q)}`)
      .then((data) => {
        if (!cancelled) {
          setResults(data)
          setStatus('done')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setToast('Search failed. Please try again.')
          setResults([])
          setStatus('error')
        }
      })

    return () => { cancelled = true }
  }, [debouncedQuery])

  return (
    <div className="h-screen flex flex-col bg-base-200 overflow-hidden">
      <div className="w-full max-w-2xl mx-auto flex flex-col h-full p-4 lg:py-8">
        {/* Island card on wider screens */}
        <div className="flex flex-col h-full lg:bg-base-100 lg:rounded-2xl lg:shadow-xl lg:border lg:border-base-300 overflow-hidden">

          {/* Search bar */}
          <div className="p-4 lg:p-6 shrink-0 border-b border-base-300">
            <label className="input input-bordered flex items-center gap-2 w-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="search"
                className="grow"
                placeholder="Search news…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {status === 'loading' && (
                <span className="loading loading-spinner loading-sm opacity-50" />
              )}
            </label>
          </div>

          {/* Results area */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {status === 'loading' && (
              <div data-testid="skeleton-list">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-14 w-full rounded-xl mb-2" />
                ))}
              </div>
            )}

            {status !== 'loading' && results.length > 0 && (
              results.map((item) => (
                <SearchNewsItem key={item.id} item={item} onError={showToast} />
              ))
            )}

            {(status === 'done' || status === 'error') && results.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-base-content/40 py-16">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">No results found</p>
              </div>
            )}

            {status === 'idle' && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-base-content/30 py-16">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <p className="text-sm">Start typing to search</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
