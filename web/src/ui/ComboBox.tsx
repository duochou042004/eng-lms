import { ChevronDown } from 'lucide-react'
import { useCallback } from 'react'
import {
  Button,
  ComboBox as AriaComboBox,
  Input,
  ListBox,
  ListBoxItem,
  ListLayout,
  Popover,
  Virtualizer,
  type Key,
} from 'react-aria-components'
import { cx } from './cx'
import { FieldErrorMessage, FieldHint, FieldLabel } from './Field'
import fieldStyles from './Field.module.css'
import styles from './ComboBox.module.css'

export interface ComboBoxOption {
  id: string
  /** The visible text (one line, ellipsis) and the option's accessible name. */
  label: string
}

export interface ComboBoxProps {
  label: string
  description?: string
  errorMessage?: string
  isInvalid?: boolean
  isDisabled?: boolean
  /** Keep the array stable (memoised): React Aria builds its collection from it. */
  options: readonly ComboBoxOption[]
  /** The selected option's id (one of `options`). */
  value: string
  onChange: (id: string) => void
  /** Shown in the open list when nothing matches the typed text. */
  emptyMessage: string
  id?: string
}

/** Case-, accent- and separator-insensitive text for the "contains" filter ("hồ chí" finds "Ho_Chi_Minh"). */
function foldText(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[_\s]+/g, ' ')
    .toLowerCase()
}

const contains = (text: string, typed: string) => foldText(text).includes(foldText(typed.trim()))

/**
 * A combo box (design-system §3; React Aria `ComboBox`, the WAI-ARIA combobox pattern): a labelled input that filters
 * its options as the user types (contains, ignoring case and accents), a button that opens the whole list, and the
 * arrow keys, Enter and Escape as React Aria provides them (Escape closes the list, focus stays on the input). Only an
 * option can be chosen; leaving the field restores the selected option's text. The list is virtualised (React Aria
 * `Virtualizer`): only the rows in view are rendered, so hundreds of options stay smooth on a phone (T-M2.6 AC7).
 */
export function ComboBox({
  label,
  description,
  errorMessage,
  isInvalid,
  isDisabled,
  options,
  value,
  onChange,
  emptyMessage,
  id,
}: ComboBoxProps) {
  // A cleared input reports null: the selection stays, and leaving the field shows its text again.
  const select = useCallback((key: Key | null) => key !== null && onChange(String(key)), [onChange])
  return (
    <AriaComboBox
      id={id}
      className={cx(fieldStyles.field, styles.field)}
      defaultItems={options}
      defaultFilter={contains}
      value={value}
      onChange={select}
      allowsEmptyCollection
      isInvalid={isInvalid}
      isDisabled={isDisabled}
    >
      <FieldLabel>{label}</FieldLabel>
      <div className={styles.control}>
        <Input className={cx(fieldStyles.input, styles.input)} />
        <Button className={styles.button}>
          <ChevronDown aria-hidden="true" className={styles.icon} />
        </Button>
      </div>
      {description ? <FieldHint>{description}</FieldHint> : null}
      <FieldErrorMessage>{errorMessage}</FieldErrorMessage>
      <Popover className={styles.popover} offset={4}>
        <Virtualizer layout={ListLayout} layoutOptions={{ estimatedRowHeight: 44 }}>
          <ListBox<ComboBoxOption>
            className={styles.list}
            renderEmptyState={() => <p className={styles.empty}>{emptyMessage}</p>}
          >
            {(option) => (
              <ListBoxItem id={option.id} textValue={option.label} className={styles.option}>
                <span className={styles.optionText}>{option.label}</span>
              </ListBoxItem>
            )}
          </ListBox>
        </Virtualizer>
      </Popover>
    </AriaComboBox>
  )
}
