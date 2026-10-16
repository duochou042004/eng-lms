import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, Disclosure as AriaDisclosure, DisclosurePanel, Heading } from 'react-aria-components'
import styles from './Disclosure.module.css'

export interface DisclosureProps {
  /** The trigger's visible label (e.g. "Contact (optional)"). */
  title: string
  children: ReactNode
  /** Controlled state (a form expands a section that holds an error). */
  isExpanded?: boolean
  onExpandedChange?: (isExpanded: boolean) => void
  defaultExpanded?: boolean
  /** Heading level of the trigger inside the page outline. */
  headingLevel?: 2 | 3
}

/**
 * A collapsible section (design-system §3; interaction-states §2.1 "optional sections are collapsed rather than hidden"),
 * on React Aria's `Disclosure`: the trigger is a button inside a heading, with `aria-expanded` and `aria-controls`; the
 * chevron turns when expanded (no movement with reduced motion). The panel stays in the DOM while collapsed (hidden),
 * so its fields keep their values. States: hover, focus-visible, expanded, collapsed.
 */
export function Disclosure({ title, children, headingLevel = 2, ...props }: DisclosureProps) {
  return (
    <AriaDisclosure {...props} className={styles.disclosure}>
      <Heading level={headingLevel} className={styles.heading}>
        <Button slot="trigger" className={styles.trigger}>
          <ChevronRight aria-hidden="true" className={styles.chevron} />
          <span className={styles.title}>{title}</span>
        </Button>
      </Heading>
      <DisclosurePanel className={styles.panel}>{children}</DisclosurePanel>
    </AriaDisclosure>
  )
}
