import { useEffect, useId } from 'react'
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { Button } from './Button'
import styles from './ConfirmDialog.module.css'

export interface ConfirmDialogProps {
  isOpen: boolean
  /** The question, naming the object ("Discard this student?"): the heading and the dialog's accessible name. */
  title: string
  /** The consequence, in one or two sentences. */
  description: string
  /** The confirming verb ("Discard"); a danger button. */
  confirmLabel: string
  /** The safe way out ("Keep editing"); it has focus when the dialog opens. */
  cancelLabel: string
  onConfirm: () => void
  /** Cancel, Esc. */
  onCancel: () => void
}

/**
 * A confirmation before a destructive or irreversible step (design-system §3, interaction-states §2.6 and §2.9), in the
 * WAI-ARIA alert dialog pattern on React Aria's modal `Dialog` (`role="alertdialog"`): focus moves to the safe action
 * and is contained, Esc cancels, an outside click does nothing (the choice is explicit), and focus returns to where it
 * was. Also the unsaved changes guard's dialog.
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelId = useId()
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
      className={styles.overlay}
    >
      <Modal className={styles.modal}>
        <Dialog role="alertdialog" className={styles.dialog}>
          <Heading slot="title" className={styles.title}>
            {title}
          </Heading>
          <p className={styles.description}>{description}</p>
          <div className={styles.actions}>
            <Button variant="danger" onPress={onConfirm}>
              {confirmLabel}
            </Button>
            <Button id={cancelId} variant="secondary" onPress={onCancel}>
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
