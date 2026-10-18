import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { cx } from './cx'
import { IconButton } from './IconButton'
import { useModalOpen } from './modalStack'
import styles from './Sheet.module.css'

export interface SheetProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  /** The visible heading and the dialog's accessible name. */
  title: string
  /** The Close button's accessible name. */
  closeLabel: string
  /** `start`: a full-height panel from the inline-start edge (navigation drawer); `bottom`: a bottom sheet. */
  placement: 'start' | 'bottom'
  children: ReactNode
  /** Pinned below the scrolling body (e.g. the drawer's account section). */
  footer?: ReactNode
}

/**
 * A modal sheet (design-system §3, responsive-standards §3 items 5–7): focus moves in and is contained, Esc, a tap on
 * the scrim and the visible Close button close it, and focus returns to the element that opened it. A bottom sheet
 * shows a decorative drag handle; swiping is never needed. It slides in (enter only: closing is immediate, so a
 * navigation from inside can move focus to the new page at once); with reduced motion nothing moves (the motion
 * duration token is 0 ms).
 */
export function Sheet({ isOpen, onOpenChange, title, closeLabel, placement, children, footer }: SheetProps) {
  useModalOpen(isOpen)
  return (
    <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable className={styles.overlay}>
      <Modal className={cx(styles.sheet, styles[placement])} data-placement={placement}>
        <Dialog className={styles.dialog}>
          {placement === 'bottom' ? <span aria-hidden="true" className={styles.handle} /> : null}
          <div className={styles.header}>
            <Heading slot="title" className={styles.title}>
              {title}
            </Heading>
            <IconButton label={closeLabel} icon={<X />} onPress={() => onOpenChange(false)} />
          </div>
          <div className={styles.body}>{children}</div>
          {footer ? <div className={styles.footer}>{footer}</div> : null}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
