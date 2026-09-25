import type { ReactNode } from 'react'
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components'
import { cx } from './cx'
import styles from './IconButton.module.css'

export interface IconButtonProps extends Omit<AriaButtonProps, 'className' | 'children' | 'style' | 'aria-label'> {
  /** Required accessible name (the icon is decorative). */
  label: string
  icon: ReactNode
  variant?: 'quiet' | 'secondary'
}

export function IconButton({ label, icon, variant = 'quiet', ...props }: IconButtonProps) {
  return (
    <AriaButton {...props} aria-label={label} className={cx(styles.iconButton, styles[variant])}>
      <span aria-hidden="true" className={styles.icon}>
        {icon}
      </span>
    </AriaButton>
  )
}
