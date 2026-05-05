import { useEffect, useState } from 'react'
import { API_URL } from '../config'
import { apiPost } from '../api'
import type { NewsItem } from '../types'

interface Props {
  item: NewsItem
  onError: (msg: string) => void
}

export default function SearchNewsItemSummary({ item, onError }: Props) {
  const [summary, setSummary] = useState<string | null>(item.summary)
  const [loading, setLoading] = useState(!item.summary)

  useEffect(() => {
    if (item.summary) return

    apiPost(`/news/${item.id}/summarise`, {}).catch(() => {
      // summarise endpoint failure is non-fatal; SSE error will surface it
    })

    const es = new EventSource(`${API_URL}/news/${item.id}/events`)

    es.onmessage = (e) => {
      const data = JSON.parse(e.data) as NewsItem
      setSummary(data.summary)
      setLoading(false)
      es.close()
    }

    es.onerror = () => {
      onError('Failed to load summary')
      es.close()
    }

    return () => es.close()
  }, [item.id, item.summary, onError])

  if (loading) {
    return (
      <div className="px-4 pb-4 flex flex-col gap-2" data-testid="summary-skeleton">
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
        <div className="skeleton h-4 w-4/6 rounded" />
      </div>
    )
  }

  return (
    <p className="px-4 pb-4 text-sm text-base-content/70 leading-relaxed">
      {summary || 'No summary available.'}
    </p>
  )
}
