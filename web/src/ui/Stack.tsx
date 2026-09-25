import type { ElementType, ReactNode } from 'react'
import styles from './Stack.module.css'

export type Space = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export interface StackProps {
  /** Gap between children, as a spacing token step (`--space-N`). */
  gap?: Space
  as?: ElementType
  children: ReactNode
}

/** Vertical rhythm: children stacked with a token gap. */
export function Stack({ gap = 4, as: Component = 'div', children }: StackProps) {
  return (
    <Component className={styles.stack} style={{ gap: `var(--space-${gap})` }}>
      {children}
    </Component>
  )
}
