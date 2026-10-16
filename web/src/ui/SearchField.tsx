import { Search, X } from 'lucide-react'
import {
  Button,
  Input,
  SearchField as AriaSearchField,
  type SearchFieldProps as AriaSearchFieldProps,
} from 'react-aria-components'
import { cx } from './cx'
import { FieldHint, FieldLabel } from './Field'
import fieldStyles from './Field.module.css'
import iconStyles from './IconButton.module.css'
import styles from './SearchField.module.css'

export interface SearchFieldProps extends Omit<AriaSearchFieldProps, 'className' | 'children' | 'style'> {
  /** The visible label (never a placeholder alone). */
  label: string
  hint?: string
  /** The clear button's accessible name (e.g. "Clear search"). */
  clearLabel: string
}

/**
 * A search input (design-system §3) on React Aria's `SearchField`: role `searchbox`, a visible label, a decorative search
 * icon, and a clear button (≥ 44 px, shown while there is text; Esc clears too). The owner debounces and runs the
 * search. States: as `TextField` (hover, focus-visible, disabled), plus empty and filled.
 */
export function SearchField({ label, hint, clearLabel, ...props }: SearchFieldProps) {
  return (
    <AriaSearchField {...props} className={cx(fieldStyles.field, styles.field)}>
      {({ isEmpty }) => (
        <>
          <FieldLabel>{label}</FieldLabel>
          <div className={styles.control}>
            <Search aria-hidden="true" className={styles.icon} />
            <Input className={cx(fieldStyles.input, styles.input)} />
            {isEmpty ? null : (
              <Button aria-label={clearLabel} className={cx(iconStyles.iconButton, styles.clear)}>
                <span aria-hidden="true" className={iconStyles.icon}>
                  <X />
                </span>
              </Button>
            )}
          </div>
          {hint ? <FieldHint>{hint}</FieldHint> : null}
        </>
      )}
    </AriaSearchField>
  )
}
