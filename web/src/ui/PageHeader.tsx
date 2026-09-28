import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

export interface PageHeaderProps {
  title: string
  description?: string
  /** Page-level actions; they wrap below the title on narrow screens. */
  actions?: ReactNode
}

/**
 * The page's single `h1` (design-system §5). The heading is a programmatic focus target (`tabIndex={-1}`): after a
 * client-side navigation the app moves focus to it (accessibility §2, frontend-architecture §3). It is not a Tab stop.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title} tabIndex={-1}>
          {title}
        </h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  )
}
