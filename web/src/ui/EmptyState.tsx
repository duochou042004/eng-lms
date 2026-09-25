import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

export interface EmptyStateProps {
  title: string
  description?: string
  /** Decorative icon. */
  icon?: ReactNode
  /** The next useful action. */
  action?: ReactNode
  /** Heading level inside the page outline. */
  headingLevel?: 2 | 3
}

export function EmptyState({ title, description, icon, action, headingLevel = 2 }: EmptyStateProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <section className={styles.empty}>
      {icon ? (
        <span aria-hidden="true" className={styles.icon}>
          {icon}
        </span>
      ) : null}
      <Heading className={styles.title}>{title}</Heading>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </section>
  )
}
