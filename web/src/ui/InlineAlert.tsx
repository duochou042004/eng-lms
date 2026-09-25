import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { cx } from './cx'
import styles from './InlineAlert.module.css'

export type AlertTone = 'info' | 'success' | 'warning' | 'danger'

const ICONS = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleAlert }

export interface InlineAlertProps {
  tone?: AlertTone
  title: string
  children?: ReactNode
  /** Extra content such as a retry button. */
  action?: ReactNode
}

/** Status always pairs colour with an icon and text (design-system §4). Danger/warning are announced assertively. */
export function InlineAlert({ tone = 'info', title, children, action }: InlineAlertProps) {
  const Icon = ICONS[tone]
  const urgent = tone === 'danger' || tone === 'warning'
  return (
    <div role={urgent ? 'alert' : 'status'} className={cx(styles.alert, styles[tone])}>
      <Icon aria-hidden="true" className={styles.icon} />
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        {children ? <div className={styles.text}>{children}</div> : null}
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
    </div>
  )
}
