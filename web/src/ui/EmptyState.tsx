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
  headingLevel?: 1 | 2 | 3
}

export function EmptyState({ title, description, icon, action, headingLevel = 2 }: EmptyStateProps) {
  const Heading = (['h1', 'h2', 'h3'] as const)[headingLevel - 1]!
  return (
    <section className={styles.empty}>
      {icon ? (
        <span aria-hidden="true" className={styles.icon}>
          {icon}
        </span>
      ) : null}
      {/* As a page's h1 it is the focus target after a client-side navigation (see PageHeader); never a Tab stop. */}
      <Heading className={styles.title} tabIndex={headingLevel === 1 ? -1 : undefined}>
        {title}
      </Heading>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </section>
  )
}
