import { useEffect, useId, type ReactNode } from 'react'
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { Button } from './Button'
import styles from './ConfirmDialog.module.css'

export interface ConfirmDialogProps {
  isOpen: boolean
  /** The question, naming the object ("Discard this student?"): the heading and the dialog's accessible name. */
  title: string
  /** The consequence, in one or two sentences. */
  description: string
  /** The confirming verb ("Discard"). */
  confirmLabel: string
  /** `danger` (default) for a destructive step; `primary` for a safe one ("Reload"). */
  confirmVariant?: 'danger' | 'primary'
  /** The safe way out ("Keep editing"); it has focus when the dialog opens. */
  cancelLabel: string
  /** The confirm request is running: the confirm button shows `pendingLabel`; Esc and Cancel do nothing. */
  isPending?: boolean
  pendingLabel?: string
  onConfirm: () => void
  /** Cancel, Esc. */
  onCancel: () => void
  /** Extra content under the description: an `InlineAlert`, a `CopyButton`. */
  children?: ReactNode
}

/**
 * A confirmation before a destructive or irreversible step (design-system §3, interaction-states §2.6, §2.8 and §2.9),
 * in the WAI-ARIA alert dialog pattern on React Aria's modal `Dialog` (`role="alertdialog"`): focus moves to the safe
 * action and is contained, Esc cancels, an outside click does nothing (the choice is explicit), and focus returns to
 * where it was. While `isPending` it cannot be dismissed. Also the unsaved changes guard's and the conflict dialog.
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  confirmVariant = 'danger',
  cancelLabel,
  isPending = false,
  pendingLabel,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const cancelId = useId()
  return (
    <ModalOverlay
      isOpen={isOpen}
      isKeyboardDismissDisabled={isPending}
      onOpenChange={(open) => {
        if (!open && !isPending) onCancel()
      }}
      className={styles.overlay}
    >
      <Modal className={styles.modal}>
        <Dialog role="alertdialog" className={styles.dialog}>
          <Heading slot="title" className={styles.title}>
            {title}
          </Heading>
          <p className={styles.description}>{description}</p>
          {children ? <div className={styles.content}>{children}</div> : null}
          <div className={styles.actions}>
            <Button variant={confirmVariant} isPending={isPending} onPress={onConfirm}>
              {isPending && pendingLabel ? pendingLabel : confirmLabel}
            </Button>
            <Button
              id={cancelId}
              variant="secondary"
              onPress={() => {
                if (!isPending) onCancel()
              }}
            >
              {cancelLabel}
            </Button>
            <FocusOnMount id={cancelId} />
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

/**
 * Moves focus to the safe action when the dialog opens (WAI-ARIA alert dialog pattern). A child's effect runs before
 * the dialog's own, which then leaves focus where it is (inside).
 */
function FocusOnMount({ id }: { id: string }) {
  useEffect(() => document.getElementById(id)?.focus(), [id])
  return null
}
