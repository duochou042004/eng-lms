import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import {
  Input,
  TextField as AriaTextField,
  ToggleButton,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components'
import { FieldErrorMessage, FieldHint, FieldLabel } from './Field'
import fieldStyles from './Field.module.css'
import iconStyles from './IconButton.module.css'
import styles from './PasswordField.module.css'
import { cx } from './cx'

export interface PasswordFieldProps extends Omit<AriaTextFieldProps, 'className' | 'children' | 'style' | 'type'> {
  label: string
  /** Accessible name of the reveal toggle (e.g. "Show password"); its pressed state says whether the text shows. */
  revealLabel: string
  hint?: string
  /** Shown when the field is invalid. */
  errorMessage?: string
  /** `current-password` (sign-in, current) or `new-password` (design-system §3, accessibility §1.10). */
  autoComplete: 'current-password' | 'new-password'
}

/**
 * A password input with a reveal toggle (design-system §3 "PasswordField"). The toggle is a toggle button with a fixed
 * name and `aria-pressed`, after the input in the Tab order; it never submits the form. Paste and password managers
 * work (WCAG 3.3.8). States: as `TextField` (hover, focus-visible, invalid, disabled) plus revealed / hidden.
 */
export function PasswordField({ label, revealLabel, hint, errorMessage, isDisabled, ...props }: PasswordFieldProps) {
  const [revealed, setRevealed] = useState(false)
  return (
    <AriaTextField
      {...props}
      isDisabled={isDisabled}
      type={revealed ? 'text' : 'password'}
      className={fieldStyles.field}
    >
      <FieldLabel>{label}</FieldLabel>
      <div className={styles.control}>
        <Input className={cx(fieldStyles.input, styles.input)} spellCheck={false} autoCapitalize="none" />
        <ToggleButton
          aria-label={revealLabel}
          isSelected={revealed}
          onChange={setRevealed}
          isDisabled={isDisabled}
          className={cx(iconStyles.iconButton, styles.toggle)}
        >
          <span aria-hidden="true" className={iconStyles.icon}>
            {revealed ? <EyeOff /> : <Eye />}
          </span>
        </ToggleButton>
      </div>
      {hint ? <FieldHint>{hint}</FieldHint> : null}
      <FieldErrorMessage>{errorMessage}</FieldErrorMessage>
    </AriaTextField>
  )
}
