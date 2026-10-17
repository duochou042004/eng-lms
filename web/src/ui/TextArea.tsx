import {
  Text,
  TextArea as AriaTextArea,
  TextField as AriaTextField,
  useLocale,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components'
import { cx } from './cx'
import { FieldErrorMessage, FieldLabel } from './Field'
import fieldStyles from './Field.module.css'
import styles from './TextArea.module.css'

export interface TextAreaProps extends Omit<AriaTextFieldProps, 'className' | 'children' | 'style'> {
  label: string
  hint?: string
  /** Shown when the field is invalid. */
  errorMessage?: string
  /**
   * The length limit shown by the counter ("120 / 2,000", in code points like validation-rules). Typing past it is not
   * blocked (the form's validation reports it), so a paste is never cut silently.
   */
  maxLength?: number
}

/**
 * Multi-line text input (design-system §3): a visible label, an optional hint and a counter in its description, and an
 * error linked by ARIA. It grows with its content (`field-sizing: content`, from three lines). States: as `TextField`
 * (hover, focus-visible, invalid, disabled); the counter turns to the danger colour past the limit.
 */
export function TextArea({ label, hint, errorMessage, maxLength, ...props }: TextAreaProps) {
  const { locale } = useLocale()
  const value = props.value ?? props.defaultValue ?? ''
  const length = [...value].length
  const number = new Intl.NumberFormat(locale)
  return (
    <AriaTextField {...props} className={fieldStyles.field}>
      <FieldLabel>{label}</FieldLabel>
      <AriaTextArea className={cx(fieldStyles.input, styles.textArea)} />
      {hint || maxLength ? (
        <Text slot="description" className={cx(fieldStyles.hint, styles.description)}>
          {hint ? <span>{hint}</span> : null}
          {maxLength ? (
            <span className={styles.counter} data-over={length > maxLength || undefined}>
              {`${number.format(length)} / ${number.format(maxLength)}`}
            </span>
          ) : null}
        </Text>
      ) : null}
      <FieldErrorMessage>{errorMessage}</FieldErrorMessage>
    </AriaTextField>
  )
}
