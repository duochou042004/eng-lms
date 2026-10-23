import { CircleAlert } from 'lucide-react'
import { useId, type MouseEvent, type Ref } from 'react'
import styles from './ErrorSummary.module.css'

export interface ErrorSummaryItem {
  /** The `id` of the invalid input (its link target), or none for an error not tied to a field. */
  fieldId?: string
  message: string
}

export interface ErrorSummaryProps {
  title: string
  errors: readonly ErrorSummaryItem[]
  /** The title's level: `2` under the page `h1` (default), `3` inside a section `h2` (design-system §3, T-M2.15 UX-4). */
  headingLevel?: 2 | 3
  /** The form moves focus here after a failed submit (interaction-states §2.3). */
  ref?: Ref<HTMLDivElement>
}

/**
 * The list of a form's errors above the form (design-system §3, interaction-states §2.3). An `alert` region and a
 * programmatic focus target (`tabIndex={-1}`, not a Tab stop); each field error is a link that moves focus to its input.
 * Renders nothing without errors.
 */
export function ErrorSummary({ title, errors, headingLevel = 2, ref }: ErrorSummaryProps) {
  const titleId = useId()
  if (errors.length === 0) return null
  const Heading = headingLevel === 3 ? 'h3' : 'h2'
  const focusField = (fieldId: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    const field = document.getElementById(fieldId)
    if (!field) return
    event.preventDefault()
    field.focus() // focus() also scrolls the field into view
  }
  return (
    <div ref={ref} role="alert" aria-labelledby={titleId} tabIndex={-1} className={styles.summary}>
      <CircleAlert aria-hidden="true" className={styles.icon} />
      <div className={styles.body}>
        <Heading id={titleId} className={styles.title}>
          {title}
        </Heading>
        <ul className={styles.list}>
          {errors.map((error) => (
            <li key={`${error.fieldId ?? ''}:${error.message}`}>
              {error.fieldId ? (
                <a href={`#${error.fieldId}`} onClick={focusField(error.fieldId)} className={styles.link}>
                  {error.message}
                </a>
              ) : (
                error.message
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
