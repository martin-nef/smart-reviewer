import { renderHook, act } from '@testing-library/react'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300))
    expect(result.current).toBe('hello')
  })

  it('does not update before delay elapses', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), {
      initialProps: { v: 'a' },
    })
    rerender({ v: 'b' })
    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toBe('a')
  })

  it('updates after delay elapses', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), {
      initialProps: { v: 'a' },
    })
    rerender({ v: 'b' })
    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toBe('b')
  })

  it('only reflects the latest value when updated rapidly', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), {
      initialProps: { v: 'a' },
    })
    rerender({ v: 'b' })
    act(() => vi.advanceTimersByTime(100))
    rerender({ v: 'c' })
    act(() => vi.advanceTimersByTime(100))
    rerender({ v: 'd' })
    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toBe('d')
  })
})
