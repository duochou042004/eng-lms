import { Input, TextField as AriaTextField, type TextFieldProps as AriaTextFieldProps } from 'react-aria-components'
import { FieldErrorMessage, FieldHint, FieldLabel } from './Field'
import fieldStyles from './Field.module.css'

export interface TextFieldProps extends Omit<AriaTextFieldProps, 'className' | 'children' | 'style'> {
  label: string
  hint?: string
  /** Shown when the field is invalid (`isInvalid` or failed native validation). */
  errorMessage?: string
  placeholder?: string
}

/** Single-line text input with a visible label, an optional hint and an error message linked by ARIA. */
export function TextField({ label, hint, errorMessage, placeholder, ...props }: TextFieldProps) {
  return (
    <AriaTextField {...props} className={fieldStyles.field}>
      <FieldLabel>{label}</FieldLabel>
      <Input className={fieldStyles.input} placeholder={placeholder} />
      {hint ? <FieldHint>{hint}</FieldHint> : null}
      <FieldErrorMessage>{errorMessage}</FieldErrorMessage>
    </AriaTextField>
  )
}
