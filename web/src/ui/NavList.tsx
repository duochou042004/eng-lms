import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { cx } from './cx'
import styles from './NavList.module.css'

/** One navigation destination: the shells keep one list of these, so a later task adds an item by adding a row. */
export interface NavItem {
  id: string
  label: string
  /** Decorative icon; the label is always visible (design-system §6 item 4). */
  icon: ReactNode
  to: string
}

export interface NavListProps {
  /** The `nav` landmark's accessible name (distinct per navigation region). */
  label: string
  items: readonly NavItem[]
  orientation?: 'vertical' | 'horizontal'
  /** Called when an item is activated (e.g. to close the drawer that holds the list before the navigation). */
  onNavigate?: () => void
}

/**
 * A `nav` landmark with a list of links, each an icon and a label (design-system §3). The current item (the route or a
 * route below it) has `aria-current="page"` and a visible marker that is not colour alone: a bar on its inline-start
 * edge (vertical) or block-end edge (horizontal) and a semibold label. States: hover, focus-visible, current. Items are
 * ≥ 44 px targets.
 */
export function NavList({ label, items, orientation = 'vertical', onNavigate }: NavListProps) {
  return (
    <nav aria-label={label}>
      <ul className={cx(styles.list, styles[orientation])}>
        {items.map((item) => (
          <li key={item.id}>
            <NavLink to={item.to} className={styles.item} onClick={onNavigate}>
              <span aria-hidden="true" className={styles.icon}>
                {item.icon}
              </span>
              <span className={styles.label}>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
