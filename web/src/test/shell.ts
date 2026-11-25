import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { sessionBody, type TestRole } from './server'

/**
 * Opens the account menu of a shell at the default jsdom width (1024 px: the tutor's and the student's top bar have
 * the account menu button, named after the user; the MSW sessions have no display name, so the username).
 */
export async function openAccountMenu(role: TestRole = 'TUTOR') {
  await userEvent.click(await screen.findByRole('button', { name: sessionBody(role).username }))
  return screen.findByRole('dialog')
}

/**
 * An overlay's visible Close (the icon button): React Aria's visually hidden dismiss buttons are named "Đóng" in vi too
 * (T-M2.32 (f)).
 */
export function visibleClose(scope: HTMLElement, name = 'Đóng') {
  const close = within(scope)
    .getAllByRole('button', { name })
    .find((button) => button.querySelector('svg'))
  if (!close) throw new Error(`no visible "${name}" button`)
  return close
}
