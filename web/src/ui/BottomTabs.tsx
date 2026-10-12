import type { ReactNode } from 'react'
import { Button } from 'react-aria-components'
import { NavLink } from 'react-router'
import styles from './BottomTabs.module.css'
import type { NavItem } from './NavList'

export interface BottomTabsAction {
  label: string
  icon: ReactNode
  onPress: () => void
  /** Whether the dialog this tab opens is open (`aria-expanded`). */
  isExpanded: boolean
}

export interface BottomTabsProps {
  /** The `nav` landmark's accessible name. */
  label: string
  items: readonly NavItem[]
  /** A last tab that opens a dialog instead of navigating (e.g. "More" → a bottom sheet). */
  action?: BottomTabsAction
}

/**
 * The student's phone navigation (design-system §3, information-architecture §3): a bar fixed to the bottom edge with
 * equal tabs, each an icon above an always-visible label, ≥ 44 px tall, padded for `env(safe-area-inset-bottom)`. The
 * page scroll padding keeps a focused element clear of it (accessibility §1 rule 15); the shell pads its content by
 * the bar's height. The current tab has `aria-current="page"` and a bar on its top edge plus a semibold label (not
 * colour alone). States: hover, focus-visible, current, pressed (action).
 */
export function BottomTabs({ label, items, action }: BottomTabsProps) {
  return (
    <nav aria-label={label} className={styles.bar} data-bottom-tabs="">
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.cell}>
            <NavLink to={item.to} className={styles.tab}>
              <span aria-hidden="true" className={styles.icon}>
                {item.icon}
              </span>
              <span className={styles.label} title={item.label}>
                {item.label}
              </span>
            </NavLink>
          </li>
        ))}
        {action ? (
          <li className={styles.cell}>
            <Button
              className={styles.tab}
              onPress={action.onPress}
              aria-haspopup="dialog"
              aria-expanded={action.isExpanded}
            >
              <span aria-hidden="true" className={styles.icon}>
                {action.icon}
              </span>
              <span className={styles.label} title={action.label}>
                {action.label}
              </span>
            </Button>
          </li>
        ) : null}
      </ul>
    </nav>
  )
}
