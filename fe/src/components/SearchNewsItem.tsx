import { useState } from 'react'
import type { NewsItem } from '../types'
import SearchNewsItemSummary from './SearchNewsItemSummary'

interface Props {
  item: NewsItem
  onError: (msg: string) => void
}

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

export default function SearchNewsItem({ item, onError }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-base-300 rounded-xl mb-2 overflow-hidden bg-base-100 transition-colors hover:border-base-content/20">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        aria-expanded={expanded}
      >
        <span className="font-medium text-base-content flex-1 leading-snug">{item.title}</span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="btn btn-ghost btn-xs shrink-0"
          aria-label="Open article"
          title="Open article"
        >
          <ExternalLinkIcon />
        </a>
      </div>
      {expanded && <SearchNewsItemSummary item={item} onError={onError} />}
    </div>
  )
}
