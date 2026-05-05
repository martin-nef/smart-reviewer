import { render, screen, fireEvent } from '@testing-library/react'
import SearchNewsItem from './SearchNewsItem'
import type { NewsItem } from '../types'

vi.mock('./SearchNewsItemSummary', () => ({
  default: () => <div data-testid="summary">Summary content</div>,
}))

const item: NewsItem = {
  id: 'abc001',
  title: 'Test Article Title',
  url: 'https://example.com/article',
  summary: 'Existing summary',
  sentiment: 'positive',
  image_url: null,
}

describe('SearchNewsItem', () => {
  it('renders the title', () => {
    render(<SearchNewsItem item={item} onError={vi.fn()} />)
    expect(screen.getByText('Test Article Title')).toBeInTheDocument()
  })

  it('renders external link with correct href', () => {
    render(<SearchNewsItem item={item} onError={vi.fn()} />)
    const link = screen.getByRole('link', { name: /open article/i })
    expect(link).toHaveAttribute('href', 'https://example.com/article')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('summary is not visible initially', () => {
    render(<SearchNewsItem item={item} onError={vi.fn()} />)
    expect(screen.queryByTestId('summary')).not.toBeInTheDocument()
  })

  it('expands to show summary on click', () => {
    render(<SearchNewsItem item={item} onError={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /test article title/i }))
    expect(screen.getByTestId('summary')).toBeInTheDocument()
  })

  it('collapses on second click', () => {
    render(<SearchNewsItem item={item} onError={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /test article title/i })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(screen.queryByTestId('summary')).not.toBeInTheDocument()
  })

  it('clicking external link does not toggle expansion', () => {
    render(<SearchNewsItem item={item} onError={vi.fn()} />)
    const link = screen.getByRole('link', { name: /open article/i })
    fireEvent.click(link)
    expect(screen.queryByTestId('summary')).not.toBeInTheDocument()
  })
})
