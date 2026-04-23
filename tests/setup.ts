import React from 'react'
import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

vi.mock('next/image', () => ({
  default: function MockNextImage(props: Record<string, unknown>) {
    const { src, alt, priority: _pr, fill: _fi, sizes: _si, className, ...rest } = props
    return React.createElement('img', {
      src: src as string | undefined,
      alt: alt as string | undefined,
      className: className as string | undefined,
      'data-testid': 'next-image',
      ...rest,
    })
  },
}))

// Clean up after each test
afterEach(() => {
  cleanup()
})
