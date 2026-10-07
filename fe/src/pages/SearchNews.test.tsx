import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import SearchNews from './SearchNews'
import searchResults from '../fixtures/search_news.json'

// Bypass debounce so tests react immediately to input changes
// (set `debounce.frozen` to simulate the delay not having elapsed yet)
const debounce = vi.hoisted(() => ({ frozen: false }))
vi.mock('../hooks/useDebounce', async () => {
  const { useRef } = await import('react')
  return {
    useDebounce: <T,>(value: T) => {
      const ref = useRef(value)
      if (!debounce.frozen) ref.current = value
      return ref.current
    },
  }
})

vi.mock('../api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

vi.mock('../components/SearchNewsItem', () => ({
  default: ({ item }: { item: { title: string } }) => (
    <div data-testid="news-item">{item.title}</div>
  ),
}))

import { apiGet, ApiError } from '../api'
const mockApiGet = vi.mocked(apiGet)

// jsdom has no IntersectionObserver; capture instances so tests can fire them.
const observers: { callback: IntersectionObserverCallback; disconnected: boolean }[] = []
const scrollToEnd = () => {
  const live = observers.filter((o) => !o.disconnected).at(-1)!
  act(() => live.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
}

beforeEach(() => {
  vi.clearAllMocks()
  debounce.frozen = false
  observers.length = 0
  vi.stubGlobal('IntersectionObserver', class {
    entry = { callback: undefined as unknown as IntersectionObserverCallback, disconnected: false }
    constructor(cb: IntersectionObserverCallback) {
      this.entry.callback = cb
      observers.push(this.entry)
    }
    observe() {}
    unobserve() {}
    takeRecords() { return [] }
    disconnect() { this.entry.disconnected = true }
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('SearchNews', () => {
  it('renders the search input', () => {
    render(<SearchNews />)
    expect(screen.getByPlaceholderText('Search news…')).toBeInTheDocument()
  })

  it('shows idle state initially', () => {
    render(<SearchNews />)
    expect(screen.getByText('Start typing to search')).toBeInTheDocument()
  })

  it('shows skeleton while loading', async () => {
    let resolve: (v: unknown) => void
    mockApiGet.mockReturnValue(new Promise((r) => { resolve = r }))

    render(<SearchNews />)
    fireEvent.change(screen.getByPlaceholderText('Search news…'), { target: { value: 'apple' } })

    expect(await screen.findByTestId('skeleton-list')).toBeInTheDocument()
    resolve!(searchResults)
  })

  it('shows skeleton while typing, before the debounced search runs', () => {
    debounce.frozen = true

    render(<SearchNews />)
    fireEvent.change(screen.getByPlaceholderText('Search news…'), { target: { value: 'ap' } })

    expect(screen.getByTestId('skeleton-list')).toBeInTheDocument()
    expect(mockApiGet).not.toHaveBeenCalled()
  })

  it('shows results after successful search', async () => {
    mockApiGet.mockResolvedValue(searchResults)

    render(<SearchNews />)
    fireEvent.change(screen.getByPlaceholderText('Search news…'), { target: { value: 'apple' } })

    await waitFor(() => {
      expect(screen.getAllByTestId('news-item')).toHaveLength(searchResults.length)
    })
  })

  it('shows no results when empty array returned', async () => {
    mockApiGet.mockResolvedValue([])

    render(<SearchNews />)
    fireEvent.change(screen.getByPlaceholderText('Search news…'), { target: { value: 'xyzzy' } })

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument()
    })
  })

  it('shows rate limit toast on 429', async () => {
    mockApiGet.mockRejectedValue(new ApiError(429, 'HTTP 429'))

    render(<SearchNews />)
    fireEvent.change(screen.getByPlaceholderText('Search news…'), { target: { value: 'fail' } })

    await waitFor(() => {
      expect(screen.getByText(/rate limit/i)).toBeInTheDocument()
    })
  })

  it('shows toast on API error', async () => {
    mockApiGet.mockRejectedValue(new Error('network error'))

    render(<SearchNews />)
    fireEvent.change(screen.getByPlaceholderText('Search news…'), { target: { value: 'fail' } })

    await waitFor(() => {
      expect(screen.getByText(/search failed/i)).toBeInTheDocument()
    })
  })

  it('calls api with encoded query param', async () => {
    mockApiGet.mockResolvedValue([])

    render(<SearchNews />)
    fireEvent.change(screen.getByPlaceholderText('Search news…'), { target: { value: 'apple news' } })

    await waitFor(() => expect(mockApiGet).toHaveBeenCalled())
    expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining('query=apple%20news'))
  })

  it('does not call api when query is blank', async () => {
    render(<SearchNews />)
    fireEvent.change(screen.getByPlaceholderText('Search news…'), { target: { value: '   ' } })

    // Let any potential async work settle
    await new Promise((r) => setTimeout(r, 50))
    expect(mockApiGet).not.toHaveBeenCalled()
  })

  it('resets to idle when search is cleared', async () => {
    mockApiGet.mockResolvedValue(searchResults)

    render(<SearchNews />)
    const input = screen.getByPlaceholderText('Search news…')

    fireEvent.change(input, { target: { value: 'apple' } })
    await waitFor(() => screen.getAllByTestId('news-item'))

    fireEvent.change(input, { target: { value: '' } })

    await waitFor(() => {
      expect(screen.getByText('Start typing to search')).toBeInTheDocument()
    })
  })

  it('cancels in-flight request when query changes', async () => {
    let firstResolve!: (v: unknown) => void
    const firstCall = new Promise((r) => { firstResolve = r })
    mockApiGet
      .mockReturnValueOnce(firstCall)
      .mockResolvedValue([])

    render(<SearchNews />)
    const input = screen.getByPlaceholderText('Search news…')

    fireEvent.change(input, { target: { value: 'apple' } })
    fireEvent.change(input, { target: { value: 'banana' } })

    await waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(2))

    // Resolve the first (stale) request after the second has settled
    firstResolve(searchResults)

    await waitFor(() => {
      // Should show empty (second query result), not the stale first result
      expect(screen.getByText('No results found')).toBeInTheDocument()
    })
  })

  it('closes the keyboard when Enter is pressed', () => {
    render(<SearchNews />)
    const input = screen.getByPlaceholderText('Search news…')
    input.focus()

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(input).not.toHaveFocus()
  })

  it('closes the keyboard when the results are dragged', () => {
    render(<SearchNews />)
    const input = screen.getByPlaceholderText('Search news…')
    input.focus()

    fireEvent.touchMove(screen.getByText('Start typing to search'))

    expect(input).not.toHaveFocus()
  })

  describe('infinite scroll', () => {
    const page2 = [{ ...searchResults[0], id: 'page2-a', title: 'Page two' }]

    const searchFor = async (value: string) => {
      render(<SearchNews />)
      fireEvent.change(screen.getByPlaceholderText('Search news…'), { target: { value } })
      await waitFor(() => screen.getAllByTestId('news-item'))
    }

    it('loads the next page when the end of the list is reached', async () => {
      mockApiGet.mockResolvedValueOnce(searchResults).mockResolvedValueOnce(page2)
      await searchFor('apple')

      scrollToEnd()

      await waitFor(() =>
        expect(screen.getAllByTestId('news-item')).toHaveLength(searchResults.length + 1),
      )
      expect(mockApiGet).toHaveBeenLastCalledWith(expect.stringContaining('page=2'))
    })

    it('stops loading once an empty page is returned', async () => {
      mockApiGet.mockResolvedValueOnce(searchResults).mockResolvedValueOnce([])
      await searchFor('apple')

      scrollToEnd()

      await waitFor(() => expect(screen.queryByTestId('load-more-sentinel')).not.toBeInTheDocument())
      expect(screen.getAllByTestId('news-item')).toHaveLength(searchResults.length)
    })

    it('does not duplicate items already shown', async () => {
      mockApiGet.mockResolvedValueOnce(searchResults).mockResolvedValueOnce(searchResults)
      await searchFor('apple')

      scrollToEnd()

      await waitFor(() => expect(mockApiGet).toHaveBeenCalledTimes(2))
      await waitFor(() => expect(screen.queryByTestId('load-more-sentinel')).toBeInTheDocument())
      expect(screen.getAllByTestId('news-item')).toHaveLength(searchResults.length)
    })

    it('offers a retry and toasts when loading more fails', async () => {
      mockApiGet
        .mockResolvedValueOnce(searchResults)
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(page2)
      await searchFor('apple')

      scrollToEnd()
      expect(await screen.findByText(/loading more results failed/i)).toBeInTheDocument()

      fireEvent.click(screen.getByText('Retry loading more'))

      await waitFor(() =>
        expect(screen.getAllByTestId('news-item')).toHaveLength(searchResults.length + 1),
      )
    })

    it('ignores a late page from a previous query', async () => {
      let resolvePage2!: (v: unknown) => void
      mockApiGet
        .mockResolvedValueOnce(searchResults)
        .mockReturnValueOnce(new Promise((r) => { resolvePage2 = r }))
        .mockResolvedValueOnce([])
      await searchFor('apple')

      scrollToEnd()
      fireEvent.change(screen.getByPlaceholderText('Search news…'), { target: { value: 'banana' } })
      await screen.findByText('No results found')

      await act(async () => resolvePage2(page2))

      expect(screen.getByText('No results found')).toBeInTheDocument()
      expect(screen.queryByTestId('news-item')).not.toBeInTheDocument()
    })
  })
})
