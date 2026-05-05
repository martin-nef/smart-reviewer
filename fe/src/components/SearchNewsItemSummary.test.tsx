import { render, screen, waitFor, act } from '@testing-library/react'
import SearchNewsItemSummary from './SearchNewsItemSummary'
import type { NewsItem } from '../types'
import eventData from '../fixtures/news_item_event.json'

vi.mock('../api', () => ({
  apiPost: vi.fn().mockResolvedValue({ status: 'ok' }),
}))

import { apiPost } from '../api'

const itemWithSummary: NewsItem = {
  id: 'abc001',
  title: 'Article with summary',
  url: 'https://example.com',
  summary: 'Pre-existing summary text',
  sentiment: 'positive',
  image_url: null,
}

const itemWithoutSummary: NewsItem = {
  id: 'abc002',
  title: 'Article without summary',
  url: 'https://example.com',
  summary: null,
  sentiment: null,
  image_url: null,
}

// Controllable EventSource mock
class MockEventSource {
  static instance: MockEventSource | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  close = vi.fn()

  constructor(public url: string) {
    MockEventSource.instance = this
  }

  dispatchMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent)
  }

  dispatchError() {
    this.onerror?.(new Event('error'))
  }
}

beforeEach(() => {
  MockEventSource.instance = null
  vi.stubGlobal('EventSource', MockEventSource)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('SearchNewsItemSummary', () => {
  it('shows existing summary immediately without calling API', () => {
    render(<SearchNewsItemSummary item={itemWithSummary} onError={vi.fn()} />)
    expect(screen.getByText('Pre-existing summary text')).toBeInTheDocument()
    expect(apiPost).not.toHaveBeenCalled()
    expect(MockEventSource.instance).toBeNull()
  })

  it('shows skeleton while waiting for SSE', () => {
    render(<SearchNewsItemSummary item={itemWithoutSummary} onError={vi.fn()} />)
    expect(screen.getByTestId('summary-skeleton')).toBeInTheDocument()
  })

  it('fires POST /summarise and opens EventSource when no summary', async () => {
    render(<SearchNewsItemSummary item={itemWithoutSummary} onError={vi.fn()} />)
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/news/abc002/summarise', {}))
    expect(MockEventSource.instance).not.toBeNull()
    expect(MockEventSource.instance!.url).toContain('/news/abc002/events')
  })

  it('shows summary when SSE message arrives', async () => {
    render(<SearchNewsItemSummary item={itemWithoutSummary} onError={vi.fn()} />)
    await waitFor(() => expect(MockEventSource.instance).not.toBeNull())

    act(() => {
      MockEventSource.instance!.dispatchMessage(eventData)
    })

    expect(screen.getByText(eventData.summary)).toBeInTheDocument()
    expect(screen.queryByTestId('summary-skeleton')).not.toBeInTheDocument()
    expect(MockEventSource.instance!.close).toHaveBeenCalled()
  })

  it('calls onError and keeps skeleton when EventSource errors', async () => {
    const onError = vi.fn()
    render(<SearchNewsItemSummary item={itemWithoutSummary} onError={onError} />)
    await waitFor(() => expect(MockEventSource.instance).not.toBeNull())

    act(() => {
      MockEventSource.instance!.dispatchError()
    })

    expect(onError).toHaveBeenCalledWith('Failed to load summary')
    expect(screen.getByTestId('summary-skeleton')).toBeInTheDocument()
    expect(MockEventSource.instance!.close).toHaveBeenCalled()
  })

  it('closes EventSource on unmount', async () => {
    const { unmount } = render(<SearchNewsItemSummary item={itemWithoutSummary} onError={vi.fn()} />)
    await waitFor(() => expect(MockEventSource.instance).not.toBeNull())
    const es = MockEventSource.instance!
    unmount()
    expect(es.close).toHaveBeenCalled()
  })
})
