import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { useState } from 'react'
import { createMemoryRouter, RouterProvider, useNavigate, type Location } from 'react-router'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { blocksNavigation } from './blocksNavigation'
import { UnsavedChangesGuard } from './UnsavedChangesGuard'

// T-M2.14 AC8 (scope 8, DEC-123 SEC S4-5): the guard's predicate and its dialog.

const at = (pathname: string, state: unknown = null) =>
  ({ pathname, search: '', hash: '', state, key: 'k' }) as Location

describe('blocksNavigation', () => {
  const from = at('/tutor/students/1')
  it.each<[string, boolean, Location, boolean]>([
    ['a clean form never blocks', false, at('/tutor/today'), false],
    ['another pathname', true, at('/tutor/today'), true],
    ['the same pathname (search or hash change)', true, at('/tutor/students/1'), false],
    ['/login (a sign-out)', true, at('/login'), false],
    ['/forbidden (a role redirect)', true, at('/forbidden'), false],
    ['the user’s own Change password', true, at('/change-password'), true],
    ['a forced /change-password', true, at('/change-password', { forced: true }), false],
    ['a forced mark on another target', true, at('/tutor/today', { forced: true }), true],
    ['a forced mark on the home path', true, at('/', { forced: true }), true],
    ['a truthy but not true forced mark', true, at('/change-password', { forced: 'yes' }), true],
  ])('%s', (_, dirty, nextLocation, blocked) => {
    expect(blocksNavigation(dirty, { currentLocation: from, nextLocation })).toBe(blocked)
  })
})

function Form() {
  const [dirty, setDirty] = useState(false)
  const navigate = useNavigate()
  return (
    <>
      <button onClick={() => setDirty(true)}>Gõ</button>
      <button onClick={() => void navigate('/other')}>Đi</button>
      <button onClick={() => void navigate('/change-password', { state: { forced: true } })}>Buộc đổi</button>
      <button onClick={() => void navigate('/other', { state: { forced: true } })}>Buộc khác</button>
      <UnsavedChangesGuard
        isDirty={dirty}
        title="Bỏ các thay đổi?"
        description="Những thay đổi bạn vừa nhập sẽ mất."
        confirmLabel="Bỏ"
        cancelLabel="Tiếp tục sửa"
      />
    </>
  )
}

function renderForm() {
  const router = createMemoryRouter(
    [
      { path: '/form', element: <Form /> },
      { path: '/other', element: <h1>Khác</h1> },
      { path: '/change-password', element: <h1>Đổi mật khẩu</h1> },
    ],
    { initialEntries: ['/form'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('UnsavedChangesGuard', () => {
  it('a clean form leaves without asking', async () => {
    const router = renderForm()
    await userEvent.click(screen.getByRole('button', { name: 'Đi' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/other'))
  })

  it('a dirty form asks: Keep editing stays, Discard leaves', async () => {
    const router = renderForm()
    await userEvent.click(screen.getByRole('button', { name: 'Gõ' }))
    await userEvent.click(screen.getByRole('button', { name: 'Đi' }))
    expect(await screen.findByRole('alertdialog', { name: 'Bỏ các thay đổi?' })).toBeInTheDocument()
    await expectNoAxeViolations(document.body)
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục sửa' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(router.state.location.pathname).toBe('/form')
    await userEvent.click(screen.getByRole('button', { name: 'Đi' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Bỏ' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/other'))
  })

  it('a forced navigation passes only to /change-password', async () => {
    const router = renderForm()
    await userEvent.click(screen.getByRole('button', { name: 'Gõ' }))
    await userEvent.click(screen.getByRole('button', { name: 'Buộc khác' }))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục sửa' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Buộc đổi' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/change-password'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('warns before the tab closes only while dirty', async () => {
    renderForm()
    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'Gõ' }))
    const dirty = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirty)
    expect(dirty.defaultPrevented).toBe(true)
  })
})
