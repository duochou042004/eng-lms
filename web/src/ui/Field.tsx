import { CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { FieldError, Label, Text } from 'react-aria-components'
import styles from './Field.module.css'

/** The label + hint + error parts shared by every form control (design-system §3 "Field"). Use inside a RAC field. */
export function FieldLabel({ children }: { children: ReactNode }) {
  return <Label className={styles.label}>{children}</Label>
}

export function FieldHint({ children }: { children: ReactNode }) {
  return (
    <Text slot="description" className={styles.hint}>
      {children}
    </Text>
  )
}

/**
 * Shown only while the field is invalid. A decorative icon precedes the text, so the error is not signalled by colour
 * alone; the text (the message given, or the native validation messages) is the accessible description.
 */
export function FieldErrorMessage({ children }: { children?: ReactNode }) {
  return (
    <FieldError className={styles.error}>
      {({ validationErrors }) => (
        <>
          <CircleAlert aria-hidden="true" className={styles.errorIcon} />
          <span>{children ?? validationErrors.join(' ')}</span>
        </>
      )}
    </FieldError>
  )
}
