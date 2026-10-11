import { Check } from 'lucide-react'
import { CheckboxButton, CheckboxField, type CheckboxFieldProps } from 'react-aria-components'
import { FieldErrorMessage, FieldHint } from './Field'
import styles from './Checkbox.module.css'

export interface CheckboxProps extends Omit<CheckboxFieldProps, 'className' | 'children' | 'style'> {
  label: string
  /** Help text under the label, linked as the checkbox's description. */
  hint?: string
  /** Shown when the checkbox is invalid. */
  errorMessage?: string
}

/**
 * A single checkbox with a visible label, an optional hint and an error (design-system §3), on React Aria's
 * `CheckboxField`. The whole row (box and label) is the ≥ 44 px target. Selected = a check icon in a filled box, so the
 * state is not colour alone. States: hover, pressed, focus-visible, selected, invalid, disabled.
 */
export function Checkbox({ label, hint, errorMessage, ...props }: CheckboxProps) {
  return (
    <CheckboxField {...props} className={styles.field}>
      <CheckboxButton className={styles.button}>
        {({ isSelected }) => (
          <>
            <span aria-hidden="true" className={styles.box}>
              {isSelected ? <Check className={styles.check} /> : null}
            </span>
            <span className={styles.label}>{label}</span>
          </>
        )}
      </CheckboxButton>
      {hint ? <FieldHint>{hint}</FieldHint> : null}
      <FieldErrorMessage>{errorMessage}</FieldErrorMessage>
    </CheckboxField>
  )
}
