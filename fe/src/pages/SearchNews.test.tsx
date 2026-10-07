import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

beforeEach(() => {
  vi.clearAllMocks()
  debounce.frozen = false
})

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
})
