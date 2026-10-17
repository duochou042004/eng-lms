import type { ReactNode } from 'react'
import styles from './DescriptionList.module.css'

export interface DescriptionItem {
  id: string
  term: string
  /** The value; `null` shows `emptyLabel` (muted text). */
  description: ReactNode | null
}

export interface DescriptionListProps {
  items: readonly DescriptionItem[]
  /** Shown for an item without a value, e.g. "Not added". */
  emptyLabel: string
}

/**
 * Term and value pairs as a `dl` (design-system §3): two columns when its container is wide enough (≥ 32rem), one
 * column (the term above its value) below that. Long values wrap (`overflow-wrap: anywhere`). An empty value says so in
 * muted text, never a blank.
 */
export function DescriptionList({ items, emptyLabel }: DescriptionListProps) {
  return (
    <div className={styles.container}>
      <dl className={styles.list}>
        {items.map((item) => (
          <div key={item.id} className={styles.item}>
            <dt className={styles.term}>{item.term}</dt>
            <dd className={styles.description}>
              {item.description === null ? <span className={styles.empty}>{emptyLabel}</span> : item.description}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
