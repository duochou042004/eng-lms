import { Outlet } from 'react-router'
import { useRouteFocus } from './routeAnnouncement'

/** The root route: stays mounted across navigations (and route errors), so it can move focus after each one. */
export function RootLayout() {
  useRouteFocus()
  return <Outlet />
}
