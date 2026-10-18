import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../../lib/api'
import { Button, ConfirmDialog, DescriptionList, InlineAlert, toast } from '../../../ui'
import { studentKeys, useChangeStatus, useResetPassword, type Student, type StudentStatusValue } from '../api/students'
import { ConflictDialog } from './ConflictDialog'
import { CredentialsCard, type CardCredentials } from './CredentialsCard'
import { StudentStatusBadge } from './StudentStatusBadge'
import styles from './Students.module.css'

type Action = 'pause' | 'resume' | 'archive' | 'reactivate'
const TARGET: Record<Action, StudentStatusValue> = {
  pause: 'PAUSED',
  resume: 'ACTIVE',
  archive: 'ARCHIVED',
  reactivate: 'ACTIVE',
}
const DONE: Record<Action, string> = {
  pause: 'account.paused',
  resume: 'account.resumed',
  archive: 'account.archived',
  reactivate: 'account.reactivated',
}
/** The status buttons for each status, in order (T-M2.14 scope 5); Reset password follows unless archived. */
const ACTIONS: Record<StudentStatusValue, Action[]> = {
  ACTIVE: ['pause', 'archive'],
  PAUSED: ['resume', 'archive'],
  ARCHIVED: ['reactivate'],
}

export interface AccountSectionProps {
  student: Student
  /** The profile form is open: every action is disabled with a hint. */
  isEditing: boolean
  /** A status or reset request is pending (here): the page disables Edit profile meanwhile. */
  isBusy: boolean
  onBusyChange: (busy: boolean) => void
  /** The reset's one-time credentials, held in the page's state (security.md T12); `null` hides the card. */
  credentials: CardCredentials | null
  onCredentials: (credentials: CardCredentials | null) => void
  /** Refetch the student (after a refused transition, a conflict's Reload, a failed Undo). */
  onRefetch: () => Promise<unknown>
  onNotFound: () => void
}

/**
 * The Profile view's Account section (IA §2, FR-STU-05, FR-AUTH-07; T-M2.14 scopes 5–6): the status and the actions
 * for it. A status button sends at once (reversible, no confirmation) and confirms with a toast; Archive's toast offers
 * Undo, which restores the previous status (two requests from Paused). Reset password asks first and shows the new
 * temporary password once on the credentials card, in place of the actions. Errors are `InlineAlert`s here, never
 * toasts; a stale version opens the conflict dialog.
 */
export function AccountSection({
  student,
  isEditing,
  isBusy,
  onBusyChange,
  credentials,
  onCredentials,
  onRefetch,
  onNotFound,
}: AccountSectionProps) {
  const { t } = useTranslation('students')
  const queryClient = useQueryClient()
  const change = useChangeStatus(student.id)
  const reset = useResetPassword(student.id)
  const ids = { title: useId(), first: useId(), reset: useId() }
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [alert, setAlert] = useState<string | null>(null)
  const [pressed, setPressed] = useState<Action | null>(null)
  const [conflict, setConflict] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [focus, setFocus] = useState<{ to: 'first' | 'reset' | 'afterUndo'; n: number } | null>(null)
  const focusTo = (to: 'first' | 'reset' | 'afterUndo') => setFocus((f) => ({ to, n: (f?.n ?? 0) + 1 }))

  // The archive toast lives until it is closed, Undo, a later success here, or leaving this student's page.
  const archiveToast = useRef<string | null>(null)
  const closeArchiveToast = () => {
    if (archiveToast.current) toast.close(archiveToast.current)
    archiveToast.current = null
  }
  useEffect(() => () => closeArchiveToast(), [])

  useEffect(() => {
    if (!focus) return
    if (focus.to === 'afterUndo') {
      // React Aria's region gave focus back to where it was before the region; when that element is gone, the h2.
      if (!document.activeElement || document.activeElement === document.body) titleRef.current?.focus()
    } else document.getElementById(focus.to === 'first' ? ids.first : ids.reset)?.focus()
  }, [focus, ids.first, ids.reset])

  const busy = (value: boolean) => onBusyChange(value)
  const latestVersion = async () => {
    const cached = queryClient.getQueryData<Student>(studentKeys.detail(student.id))
    if (cached) return cached.version
    await onRefetch()
    return queryClient.getQueryData<Student>(studentKeys.detail(student.id))!.version
  }

  const act = async (action: Action) => {
    const previous = student.status
    setAlert(null)
    setPressed(action)
    busy(true)
    try {
      await change.mutateAsync({ status: TARGET[action], version: await latestVersion() })
      closeArchiveToast()
      const message = t(DONE[action], { name: student.fullName })
      if (action === 'archive')
        archiveToast.current = toast.success(message, {
          action: { label: t('account.undo'), onAction: () => void undo(previous) },
        })
      else toast.success(message)
      focusTo('first')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.code === 'STALE_VERSION') setConflict(true)
      else if (error instanceof ApiError && error.status === 409 && error.code === 'INVALID_STATE_TRANSITION') {
        void onRefetch()
        setAlert(t('account.statusChanged'))
      } else if (error instanceof ApiError && error.status === 404) onNotFound()
      else setAlert(t(`account.failed.${action}`))
    } finally {
      setPressed(null)
      busy(false)
    }
  }

  /** Undo of an archive: back to `previous` with the latest version; from Paused two requests in order. */
  const undo = async (previous: StudentStatusValue) => {
    closeArchiveToast()
    setAlert(null)
    busy(true)
    let restoredActive = false
    try {
      const active = await change.mutateAsync({ status: 'ACTIVE', version: await latestVersion() })
      restoredActive = true
      if (previous === 'PAUSED') await change.mutateAsync({ status: 'PAUSED', version: active.version })
      toast.success(t('account.undone'))
    } catch {
      void onRefetch()
      setAlert(t(restoredActive ? 'account.restorePausedFailed' : 'account.undoFailed'))
    } finally {
      busy(false)
      focusTo('afterUndo')
    }
  }

  const confirmReset = async () => {
    setResetError(null)
    busy(true)
    try {
      const answer = await reset.mutateAsync()
      // The credentials move to the page's state; the mutation (gcTime 0) is dropped.
      reset.reset()
      closeArchiveToast()
      setAlert(null)
      setResetOpen(false)
      onCredentials({ ...answer, fullName: student.fullName })
    } catch (error) {
      reset.reset()
      if (error instanceof ApiError && error.status === 409 && error.code === 'INVALID_STATE_TRANSITION') {
        void onRefetch()
        setResetOpen(false)
        setAlert(t('account.resetArchived'))
      } else if (error instanceof ApiError && error.status === 404) {
        setResetOpen(false)
        onNotFound()
      } else setResetError(t('account.resetFailed'))
    } finally {
      busy(false)
    }
  }

  const actions = ACTIONS[student.status]
  const disabled = (own: boolean) => isEditing || (isBusy && !own)
  return (
    <section aria-labelledby={ids.title}>
      <h2 id={ids.title} ref={titleRef} tabIndex={-1} className={styles.sectionTitle}>
        {t('account.title')}
      </h2>
      <div className={styles.account}>
        {alert ? <InlineAlert tone="danger" title={alert} /> : null}
        <DescriptionList
          emptyLabel={t('workspace.notAdded')}
          items={[
            { id: 'status', term: t('account.status'), description: <StudentStatusBadge status={student.status} /> },
          ]}
        />
        {credentials ? (
          <CredentialsCard
            credentials={credentials}
            title={t('account.cardTitle')}
            intro={t('account.cardIntro', { name: credentials.fullName })}
            actions={
              <Button
                variant="secondary"
                onPress={() => {
                  onCredentials(null)
                  focusTo('reset')
                }}
              >
                {t('account.done')}
              </Button>
            }
          />
        ) : (
          <>
            {isEditing ? <p className={styles.mutedText}>{t('account.editingHint')}</p> : null}
            <div className={styles.stackedActions}>
              {/* Keyed by position: after a status change the focused button stays the same element (Archive → Reactivate). */}
              {actions.map((action, index) => (
                <Button
                  key={index}
                  id={index === 0 ? ids.first : undefined}
                  variant="secondary"
                  isPending={pressed === action}
                  isDisabled={disabled(pressed === action)}
                  onPress={() => void act(action)}
                >
                  {t(`account.${action}`)}
                </Button>
              ))}
              {student.status !== 'ARCHIVED' ? (
                <Button
                  id={ids.reset}
                  variant="secondary"
                  isDisabled={disabled(false)}
                  onPress={() => {
                    setResetError(null)
                    setResetOpen(true)
                  }}
                >
                  {t('account.resetPassword')}
                </Button>
              ) : null}
            </div>
            {student.status === 'ARCHIVED' ? <p className={styles.mutedText}>{t('account.archivedHint')}</p> : null}
          </>
        )}
      </div>
      <ConfirmDialog
        isOpen={resetOpen}
        title={t('account.resetTitle', { name: student.fullName })}
        description={t('account.resetDescription')}
        confirmLabel={t('account.resetConfirm')}
        cancelLabel={t('account.resetCancel')}
        isPending={reset.isPending}
        pendingLabel={t('account.resetting')}
        onConfirm={() => void confirmReset()}
        onCancel={() => setResetOpen(false)}
      >
        {resetError ? <InlineAlert tone="danger" title={resetError} /> : null}
      </ConfirmDialog>
      <ConflictDialog
        isOpen={conflict}
        onCancel={() => setConflict(false)}
        onReload={() => {
          setConflict(false)
          void onRefetch()
        }}
      />
    </section>
  )
}
