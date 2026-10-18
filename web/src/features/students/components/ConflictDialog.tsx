import { useTranslation } from 'react-i18next'
import { ConfirmDialog, CopyButton } from '../../../ui'

export interface ConflictDialogProps {
  isOpen: boolean
  /** Reload (primary): the caller refetches the student and discards its form. */
  onReload: () => void
  /** Cancel: the form stays as typed. */
  onCancel: () => void
  /** The typed note when it was changed: offered as **Copy my note** before Reload discards it. */
  note?: string
}

/**
 * "This was changed elsewhere" (interaction-states §2.8, T-M2.14 scope 3): a 409 `STALE_VERSION` on a profile save or a
 * status button. Reload is the primary action; Cancel keeps the form; with a changed note, Copy my note copies it.
 */
export function ConflictDialog({ isOpen, onReload, onCancel, note }: ConflictDialogProps) {
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
      {note !== undefined ? (
        <div>
          <CopyButton
            text={note}
            label={t('conflict.copyNote')}
            copiedMessage={t('card.copied')}
            failedMessage={t('card.copyFailed')}
          />
        </div>
      ) : null}
    </ConfirmDialog>
  )
}
