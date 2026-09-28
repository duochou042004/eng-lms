import { Check } from 'lucide-react'
import { type Key, ToggleButton, ToggleButtonGroup } from 'react-aria-components'
import styles from './SegmentedControl.module.css'

export interface SegmentedOption<K extends string> {
  id: K
  label: string
  /** BCP 47 language of the label, when it differs from the UI language (e.g. an endonym in a language switcher). */
  lang?: string
  isDisabled?: boolean
}

export interface SegmentedControlProps<K extends string> {
  /** Required accessible name of the group (not shown; the segments' labels make the purpose visible). */
  label: string
  options: ReadonlyArray<SegmentedOption<K>>
  selected: K
  onChange: (id: K) => void
  isDisabled?: boolean
}

/**
 * One choice out of a few, always one selected (design-system §3). Built on React Aria's ToggleButtonGroup in single
 * selection: the group is a `radiogroup` and each segment a `radio` with `aria-checked`. Keyboard: Tab into the group,
 * arrow keys between segments, Space/Enter to select. The selected segment shows a check icon **and** the accent-subtle
 * background, so the state is not carried by colour alone. States: hover, pressed, selected, focus-visible, disabled.
 */
export function SegmentedControl<K extends string>({
  label,
  options,
  selected,
  onChange,
  isDisabled,
}: SegmentedControlProps<K>) {
  return (
    <ToggleButtonGroup
      aria-label={label}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[selected]}
      onSelectionChange={(keys: Set<Key>) => {
        const [next] = keys
        if (next !== undefined && next !== selected) onChange(next as K)
      }}
      isDisabled={isDisabled}
      className={styles.group}
    >
      {options.map((option) => (
        <ToggleButton
          key={option.id}
          id={option.id}
          lang={option.lang}
          isDisabled={option.isDisabled}
          className={styles.segment}
        >
          {({ isSelected }) => (
            <>
              {isSelected ? <Check aria-hidden="true" className={styles.check} /> : null}
              <span>{option.label}</span>
            </>
          )}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
