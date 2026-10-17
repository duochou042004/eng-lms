import { cx } from './cx'
import type { StatusEntry } from './status/statusMap'
import styles from './StatusBadge.module.css'

export interface StatusBadgeProps {
  /** The entry of `status/statusMap.ts` (tone and icon). */
  status: StatusEntry
  /** The translated label of the entry's `labelKey`. */
  label: string
}

/**
 * A status as icon + text + tone (design-system §4, accessibility §1 rule 6): the text carries the meaning, the icon and
 * the colour repeat it. Not interactive.
 */
export function StatusBadge({ status, label }: StatusBadgeProps) {
  const Icon = status.icon
  return (
    <span className={cx(styles.badge, styles[status.tone])}>
      <Icon aria-hidden="true" className={styles.icon} />
      <span>{label}</span>
    </span>
  )
}
