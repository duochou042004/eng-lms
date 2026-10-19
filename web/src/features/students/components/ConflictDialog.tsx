import { useTranslation } from 'react-i18next'
import { ConfirmDialog, CopyButton } from '../../../ui'

export interface ConflictDialogProps {
  isOpen: boolean
  /** Reload (primary): the caller refetches the student and discards its form. */
  onReload: () => void
  /** Cancel: the form stays as typed. */
  onCancel: () => void
  /**
   * The typed text when it was changed, offered before Reload discards it, with its button label: "Copy my note" for
   * the profile, "Copy my notes" for a guardian (T-M2.15 scope 5).
   */
  copy?: { text: string; label: string }
}

/**
 * "This was changed elsewhere" (interaction-states §2.8, T-M2.14 scope 3, T-M2.15 scope 5): a 409 `STALE_VERSION` on a
 * profile save, a status button or a guardian save. Reload is the primary action; Cancel keeps the form; with a changed
 * note, the copy button copies it.
 */
export function ConflictDialog({ isOpen, onReload, onCancel, copy }: ConflictDialogProps) {
  const { t } = useTranslation('students')
  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={t('conflict.title')}
      description={t('conflict.description')}
      confirmLabel={t('conflict.reload')}
      confirmVariant="primary"
      cancelLabel={t('conflict.cancel')}
      onConfirm={onReload}
      onCancel={onCancel}
    >
      {copy ? (
        <div>
          <CopyButton
            text={copy.text}
            label={copy.label}
            copiedMessage={t('card.copied')}
            failedMessage={t('card.copyFailed')}
          />
        </div>
      ) : null}
    </ConfirmDialog>
  )
}
