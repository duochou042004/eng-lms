import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { setViewportWidth } from '../test/viewport'
import { BREAKPOINTS, useMinWidth } from './breakpoints'

function Probe() {
  return <p>{useMinWidth('lg') ? 'lg' : 'below lg'}</p>
}

describe('breakpoints', () => {
  it('has the responsive-standards §1 values', () => {
    expect(BREAKPOINTS).toEqual({ sm: 480, md: 768, lg: 1024, xl: 1280, '2xl': 1536 })
  })

  it('useMinWidth reads the viewport at once and follows a resize across the breakpoint', () => {
    setViewportWidth(1023)
    render(<Probe />)
    expect(screen.getByText('below lg')).toBeInTheDocument()
    act(() => setViewportWidth(1024))
    expect(screen.getByText('lg')).toBeInTheDocument()
    act(() => setViewportWidth(768))
    expect(screen.getByText('below lg')).toBeInTheDocument()
  })
})
