import { useEffect } from 'react'
import { useBlocker } from 'react-router'
import { blocksNavigation } from './blocksNavigation'
import { ConfirmDialog } from './ConfirmDialog'

export interface UnsavedChangesGuardProps {
  /** The form has unsaved changes. */
  isDirty: boolean
  /** "Discard your changes?" */
  title: string
  description: string
  /** "Discard" (danger). */
  confirmLabel: string
  /** "Keep editing" (focused on open). */
  cancelLabel: string
}

/**
 * The unsaved changes guard (design-system §3, interaction-states §2.6): while `isDirty`, an in-app navigation that
 * `blocksNavigation` asks first in a `ConfirmDialog` (Discard leaves, Keep editing stays), and closing or reloading the
 * tab shows the browser's own warning (`beforeunload`).
 */
export function UnsavedChangesGuard({
  isDirty,
  title,
  description,
  confirmLabel,
  cancelLabel,
}: UnsavedChangesGuardProps) {
  const blocker = useBlocker((args) => blocksNavigation(isDirty, args))
  useEffect(() => {
    if (!isDirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isDirty])
  return (
    <ConfirmDialog
      isOpen={blocker.state === 'blocked'}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={() => blocker.proceed?.()}
      onCancel={() => blocker.reset?.()}
    />
  )
}
