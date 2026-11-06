import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    writable: true,
    value: vi.fn(),
  })

  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: vi.fn(() => 'blob:ontrack-test'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: vi.fn(),
  })

  Object.defineProperty(window, 'scrollTo', { writable: true, value: vi.fn() })
}

class ObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [])
}

Object.defineProperty(globalThis, 'ResizeObserver', { writable: true, value: ObserverMock })
Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  value: class extends ObserverMock {
    root = null
    rootMargin = ''
    thresholds = []
  },
})
