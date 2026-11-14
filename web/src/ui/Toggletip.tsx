import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button, Dialog, DialogTrigger, Popover as AriaPopover } from 'react-aria-components'
import { cx } from './cx'
import styles from './Toggletip.module.css'

export interface ToggletipProps {
  /** The trigger's required accessible name, e.g. "Show the error" (the icon is decorative). */
  label: string
  /** The text the popover shows; it names the popover and is the trigger's `title` for mouse hover. */
  message: string
  icon: ReactNode
  tone?: 'muted' | 'danger'
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  /**
   * Called after the toggletip closed because its trigger stopped rendering a box (an owner's CSS hid it, e.g. a
   * container query on a rotation). React Aria would return focus to the hidden trigger, so move it somewhere visible.
   */
  onTriggerHidden?: () => void
}

/**
 * A quiet 44 px icon button that opens a small dialog-type popover holding one message (design-system §3): the tap
 * equivalent of a `title` tooltip, which touch screens never show (design-system §6 item 5). Focus moves into the
 * popover; Esc and a tap outside close it and focus returns to the trigger, as with `Popover`. Controlled, so the owner
 * can close it (e.g. on a navigation). A `ResizeObserver` closes it when the trigger renders no box (0 × 0) while open.
 */
export function Toggletip({
  label,
  message,
  icon,
  tone = 'muted',
  isOpen,
  onOpenChange,
  onTriggerHidden,
}: ToggletipProps) {
  const messageId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const hiddenWhileOpen = useRef(false)

  // Watched only while open: a 0 × 0 box means the trigger is no longer rendered (e.g. `display: none`).
  useEffect(() => {
    const trigger = triggerRef.current
    if (!isOpen || !trigger || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      if (trigger.offsetWidth > 0 || trigger.offsetHeight > 0) return
      hiddenWhileOpen.current = true
      onOpenChange(false)
    })
    observer.observe(trigger)
    return () => observer.disconnect()
  }, [isOpen, onOpenChange])

  // React Aria's Button drops a `title` prop; the mouse hover text (responsive-standards §3 item 8) is set on the element.
  useEffect(() => triggerRef.current?.setAttribute('title', message), [message])

  // After the popover has unmounted (its focus scope no longer holds focus), so React Aria's own return finds focus moved.
  useEffect(() => {
    if (isOpen || !hiddenWhileOpen.current) return
    hiddenWhileOpen.current = false
    onTriggerHidden?.()
  }, [isOpen, onTriggerHidden])

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <Button ref={triggerRef} aria-label={label} aria-haspopup="dialog" className={cx(styles.trigger, styles[tone])}>
        <span aria-hidden="true" className={styles.icon}>
          {icon}
        </span>
      </Button>
      {/* 16 px from the viewport edges, like the page gutters (UI rules: never wider than the viewport minus them). */}
      <AriaPopover placement="bottom" containerPadding={16} className={styles.popover}>
        <Dialog aria-labelledby={messageId} className={styles.dialog}>
          <p id={messageId} className={styles.message}>
            {message}
          </p>
        </Dialog>
      </AriaPopover>
    </DialogTrigger>
  )
}
