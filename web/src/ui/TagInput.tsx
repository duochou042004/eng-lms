import { X } from 'lucide-react'
import { useEffect, useRef, useState, type ClipboardEvent } from 'react'
import { Input, TextField as AriaTextField } from 'react-aria-components'
import { FieldErrorMessage, FieldHint, FieldLabel } from './Field'
import fieldStyles from './Field.module.css'
import { IconButton } from './IconButton'
import styles from './TagInput.module.css'
import { addTags, SEPARATORS, type TagEntryError, type TagLimits } from './tagEntry'

export interface TagListProps {
  tags: readonly string[]
}

/** Read-only tags (design-system §3): a list without bullets; chips wrap as whole chips, a long tag wraps inside its chip. */
export function TagList({ tags }: TagListProps) {
  return (
    <ul className={styles.list}>
      {tags.map((tag) => (
        <li key={tag} className={styles.chip}>
          <span className={styles.text}>{tag}</span>
        </li>
      ))}
    </ul>
  )
}

export interface TagInputProps extends TagLimits {
  label: string
  hint?: string
  /** The input's id (an `ErrorSummary` link target). */
  id?: string
  value: readonly string[]
  onChange: (value: string[]) => void
  /** The text in the input (controlled, so a form can commit it on Save and count it as a change). */
  inputValue: string
  onInputChange: (text: string) => void
  onBlur?: () => void
  /** The caller's error (a form or server error); an entry refused here shows its own messages instead. */
  errorMessage?: string
  isDisabled?: boolean
  /** The strings (`ui/` holds no feature strings). */
  messages: {
    /** The remove button's accessible name, e.g. "Remove {tag}". */
    remove: (tag: string) => string
  } & Record<TagEntryError, string>
}

/**
 * A labelled list of tags with one text input under the chips (design-system §3, T-M2.17 scope 2, DEC-140 (4)). Enter or
 * a typed comma adds the input's text; a pasted text with commas, tabs or line breaks adds each part. A refused entry
 * keeps its text in the input with its error (every reason of the entry, joined by a space) and adds nothing. Each chip has its own remove button (in the tab order);
 * removing moves focus to the next chip's, else the previous one's, else the input. Enter never submits the form; the
 * input stays enabled at `maxTags`. The whole field is a group (`fieldset`) named by the label.
 */
export function TagInput({
  label,
  hint,
  id,
  value,
  onChange,
  inputValue,
  onInputChange,
  onBlur,
  maxTags,
  maxLength,
  errorMessage,
  isDisabled,
  messages,
}: TagInputProps) {
  const [entryErrors, setEntryErrors] = useState<TagEntryError[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  // After a removal: the chip index whose remove button takes focus, or the input.
  const focusNext = useRef<number | 'input' | null>(null)
  useEffect(() => {
    const next = focusNext.current
    focusNext.current = null
    if (next === 'input') inputRef.current?.focus()
    else if (next !== null) listRef.current?.querySelectorAll('button')[next]?.focus()
  }, [value])

  /** Adds `text` (all of it) and leaves the refused entries in the input; `keep` is appended to them (a typed tail). */
  const enter = (text: string, keep = '') => {
    const entry = addTags(value, text, { maxTags, maxLength })
    if (entry.value.length !== value.length) onChange(entry.value)
    onInputChange([entry.rest, keep].filter((s) => s !== '').join(', '))
    setEntryErrors(entry.errors)
  }

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text')
    if (!SEPARATORS.test(pasted)) return
    event.preventDefault()
    const input = event.currentTarget
    const start = input.selectionStart ?? inputValue.length
    const end = input.selectionEnd ?? start
    enter(inputValue.slice(0, start) + pasted + inputValue.slice(end))
  }

  // Every reason of the last entry, each a sentence (T-M2.17 QA-2).
  const error = entryErrors.length > 0 ? entryErrors.map((reason) => messages[reason]).join(' ') : errorMessage
  return (
    <fieldset aria-label={label} className={styles.group}>
      <AriaTextField
        id={id}
        value={inputValue}
        onChange={(text) => {
          setEntryErrors([])
          // A typed comma adds what is before it; the text after the last comma stays in the input.
          if (!text.includes(',')) return onInputChange(text)
          const cut = text.lastIndexOf(',')
          enter(text.slice(0, cut), text.slice(cut + 1).trimStart())
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
          event.preventDefault()
          if (inputValue.trim() !== '') enter(inputValue)
        }}
        onPaste={onPaste}
        onBlur={onBlur}
        isDisabled={isDisabled}
        isInvalid={error !== undefined}
        validationBehavior="aria"
        autoComplete="off"
        className={fieldStyles.field}
      >
        <FieldLabel>{label}</FieldLabel>
        {value.length > 0 ? (
          <ul ref={listRef} className={styles.list}>
            {value.map((tag, index) => (
              <li key={tag} className={styles.chip}>
                <span className={styles.text}>{tag}</span>
                <IconButton
                  label={messages.remove(tag)}
                  icon={<X />}
                  isDisabled={isDisabled}
                  onPress={() => {
                    const rest = value.filter((_, i) => i !== index)
                    focusNext.current = rest.length === 0 ? 'input' : Math.min(index, rest.length - 1)
                    onChange(rest)
                  }}
                />
              </li>
            ))}
          </ul>
        ) : null}
        <Input ref={inputRef} className={fieldStyles.input} />
        {hint ? <FieldHint>{hint}</FieldHint> : null}
        <FieldErrorMessage>{error}</FieldErrorMessage>
      </AriaTextField>
    </fieldset>
  )
}
