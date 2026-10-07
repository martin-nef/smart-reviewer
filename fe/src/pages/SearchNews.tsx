import { useEffect, useRef, useState, useCallback } from 'react'
import { apiGet, ApiError } from '../api'
import { useDebounce } from '../hooks/useDebounce'
import SearchNewsItem from '../components/SearchNewsItem'
import Toast from '../components/Toast'
import type { NewsItem } from '../types'

// Long enough to avoid hammering the rate-limited news API on every pause.
const SEARCH_DEBOUNCE_MS = 800

type Status = 'idle' | 'loading' | 'done' | 'error'

// The outcome of one search, tagged with the query that produced it so that
// status/results can be derived during render instead of synced via effects.
type Outcome =
  | {
      query: string
      results: NewsItem[]
      page: number
      // The API doesn't report a total, so an empty page marks the end.
      hasMore: boolean
      loadingMore: boolean
      moreFailed: boolean
    }
  | { query: string; error: true }

const rateLimitOrGenericMessage = (err: unknown, what: string) =>
  err instanceof ApiError && err.status === 429
    ? `${what} failed: the news API rate limit was reached. Please wait a moment and try again.`
    : `${what} failed. Please try again.`

export default function SearchNews() {
  const [query, setQuery] = useState('')
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS)
  const q = debouncedQuery.trim()
  // Typing ahead of the debounced query counts as loading, so the UI reacts
  // immediately instead of waiting for the debounce to fire.
  const typing = query.trim() !== q

  const showToast = useCallback((msg: string) => setToast(msg), [])

  // Like iOS's keyboardDismissMode = .onDrag: dragging the results closes the
  // keyboard instead of resizing the layout around it, so there is only ever
  // one thing to scroll and nothing reflows.
  const dismissKeyboard = () => {
    if (document.activeElement === inputRef.current) inputRef.current?.blur()
  }

  useEffect(() => {
    if (!q) return

    let cancelled = false

    apiGet<NewsItem[]>(`/search_news?query=${encodeURIComponent(q)}`)
      .then((results) => {
        if (cancelled) return
        setOutcome({
          query: q,
          results,
          page: 1,
          hasMore: results.length > 0,
          loadingMore: false,
          moreFailed: false,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setOutcome({ query: q, error: true })
        setToast(rateLimitOrGenericMessage(err, 'Search'))
      })

    return () => { cancelled = true }
  }, [q])

  const current = outcome?.query === q ? outcome : null
  const status: Status = !query.trim()
    ? 'idle'
    : typing || !current
      ? 'loading'
      : 'error' in current
        ? 'error'
        : 'done'
  const loaded = current && 'results' in current ? current : null
  const results = loaded?.results ?? []

  const canLoadMore = !!loaded && loaded.hasMore && !loaded.loadingMore && !loaded.moreFailed
  const nextPage = loaded ? loaded.page + 1 : 0

  const loadMore = useCallback(() => {
    setOutcome((prev) =>
      prev && 'results' in prev && prev.query === q
        ? { ...prev, loadingMore: true, moreFailed: false }
        : prev,
    )

    apiGet<NewsItem[]>(`/search_news?query=${encodeURIComponent(q)}&page=${nextPage}`)
      .then((more) => {
        // Drop the response if the query changed while it was in flight.
        setOutcome((prev) => {
          if (!prev || !('results' in prev) || prev.query !== q) return prev
          const seen = new Set(prev.results.map((r) => r.id))
          return {
            ...prev,
            results: [...prev.results, ...more.filter((r) => !seen.has(r.id))],
            page: nextPage,
            hasMore: more.length > 0,
            loadingMore: false,
          }
        })
      })
      .catch((err) => {
        setOutcome((prev) =>
          prev && 'results' in prev && prev.query === q
            ? { ...prev, loadingMore: false, moreFailed: true }
            : prev,
        )
        setToast(rateLimitOrGenericMessage(err, 'Loading more results'))
      })
  }, [q, nextPage])

  // Load the next page when the sentinel at the end of the list scrolls into
  // view. The observer is recreated after every page so that a sentinel that
  // is still visible (short page, tall viewport) triggers the next load.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!canLoadMore || !sentinel || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore()
      },
      { root: scrollRef.current, rootMargin: '0px 0px 200px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [canLoadMore, loadMore])

  return (
    <div className="h-dvh flex flex-col bg-base-200 overflow-hidden">
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
                ref={inputRef}
                type="search"
                enterKeyHint="search"
                className="grow"
                placeholder="Search news…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur()
                }}
                autoFocus
              />
              {status === 'loading' && (
                <span className="loading loading-spinner loading-sm opacity-50" />
              )}
            </label>
          </div>

          {/* Results area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overscroll-y-contain p-4 lg:p-6"
            onTouchMove={dismissKeyboard}
          >
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

            {status === 'done' && loaded && results.length > 0 && (
              loaded.moreFailed ? (
                <div className="flex justify-center py-4">
                  <button type="button" className="btn btn-sm btn-ghost" onClick={loadMore}>
                    Retry loading more
                  </button>
                </div>
              ) : loaded.hasMore ? (
                <div ref={sentinelRef} data-testid="load-more-sentinel" className="flex justify-center py-4">
                  {loaded.loadingMore && <span className="loading loading-spinner loading-sm opacity-50" />}
                </div>
              ) : null
            )}

            {(status === 'done' || status === 'error') && results.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-full gap-2 text-base-content/40">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">No results found</p>
              </div>
            )}

            {status === 'idle' && (
              <div className="flex flex-col items-center justify-center min-h-full gap-2 text-base-content/30">
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
