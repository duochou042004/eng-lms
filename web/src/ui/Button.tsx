import type { ReactNode } from 'react'
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components'
import { cx } from './cx'
import styles from './Button.module.css'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'
export type ButtonSize = 'md' | 'lg'

export interface ButtonProps extends Omit<AriaButtonProps, 'className' | 'children' | 'style'> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

/** Actions (design-system §3). States: hover, focus-visible, pressed, disabled, pending (`isPending`). */
export function Button({ variant = 'primary', size = 'md', children, ...props }: ButtonProps) {
  return (
    <AriaButton {...props} className={cx(styles.button, styles[variant], styles[size])}>
      {props.isPending ? <Spinner /> : null}
      <span className={styles.label}>{children}</span>
    </AriaButton>
  )
}
