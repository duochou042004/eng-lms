import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, Dialog, DialogTrigger, Popover as AriaPopover } from 'react-aria-components'
import styles from './Popover.module.css'

export interface PopoverProps {
  /** The trigger button's visible text and accessible name, e.g. the signed-in user's name; truncated with a tooltip. */
  triggerLabel: string
  /** A decorative icon before the trigger label. */
  triggerIcon?: ReactNode
  /** The dialog's accessible name. */
  label: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  children: ReactNode
}

/**
 * A button that opens a dialog-type popover (design-system §3): not an ARIA `menu`, so it may hold any controls (e.g.
 * a segmented control). Focus moves into the popover and is contained; Esc and a click outside close it and focus
 * returns to the button. The popover has a fixed inline size (`--size-popover`), so a change of its content (a language
 * switch) never moves it. Controlled, so the owner can close it (e.g. on a navigation). The trigger is as wide as
 * `--size-account-button`, so a loading skeleton can take its exact shape; long content truncates.
 */
export function Popover({ triggerLabel, triggerIcon, label, isOpen, onOpenChange, children }: PopoverProps) {
  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <Button className={styles.trigger} aria-haspopup="dialog">
        {triggerIcon ? (
          <span aria-hidden="true" className={styles.icon}>
            {triggerIcon}
          </span>
        ) : null}
        <span className={styles.triggerText} title={triggerLabel}>
          {triggerLabel}
        </span>
        <ChevronDown aria-hidden="true" className={styles.chevron} />
      </Button>
      <AriaPopover placement="bottom end" className={styles.popover}>
        <Dialog aria-label={label} className={styles.dialog}>
          {children}
        </Dialog>
      </AriaPopover>
    </DialogTrigger>
  )
}
