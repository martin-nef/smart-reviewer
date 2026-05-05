import { useEffect, useRef, useState } from 'react'
import { API_URL } from '../config'
import { apiPost } from '../api'
import type { NewsItem } from '../types'

interface Props {
  item: NewsItem
  onError: (msg: string) => void
}

export default function SearchNewsItemSummary({ item, onError }: Props) {
  const [summary, setSummary] = useState<string | null>(item.summary)
  const [sentiment, setSentiment] = useState<string | null>(item.sentiment)
  const [loading, setLoading] = useState(!item.summary)
  // Persists across StrictMode double-invoke so the POST fires exactly once
  const summariseSent = useRef(false)

  useEffect(() => {
    if (item.summary) return

    if (!summariseSent.current) {
      summariseSent.current = true
      apiPost(`/news/${item.id}/summarise`, {}).catch(() => {})
    }

    const es = new EventSource(`${API_URL}/news/${item.id}/events`)
    // Guard against onerror firing when the server closes the stream after a
    // successful message — EventSource fires onerror on any connection close.
    let received = false

    es.onmessage = (e) => {
      received = true
      const data = JSON.parse(e.data) as NewsItem
      setSummary(data.summary)
      setSentiment(data.sentiment)
      setLoading(false)
      es.close()
    }

    es.onerror = () => {
      if (!received) onError('Failed to load summary')
      es.close()
    }

    return () => es.close()
  }, [item.id, item.summary, onError])

  let sentimentEmoji = '';
  switch (sentiment) {
    case 'positive':
      sentimentEmoji = '😊 ';
      break
    case 'negative':
      sentimentEmoji = '😞 ';
      break
    case 'neutral':
      sentimentEmoji = '😐 ';
      break
    default:
      break;
  }

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
      {sentimentEmoji}
      {summary || 'No summary available.'}
    </p>
  )
}
