import { screen } from '@testing-library/react'
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
