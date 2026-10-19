import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../../lib/api'
import { Button, ConfirmDialog, DelayedSkeleton, DescriptionList, InlineAlert, Skeleton, toast } from '../../../ui'
import { useGuardians, useRemoveGuardian, type Guardian } from '../api/guardians'
import { isTutorSession } from '../api/tutorSession'
import { GUARDIANS_MAX } from '../model/guardianSchema'
import { ContactValue } from './ContactValue'
import { GuardianForm, type GuardianFormResult } from './GuardianForm'
import styles from './Students.module.css'

/** Which form of the Profile view is open (T-M2.15 scope 6): at most one. */
export type OpenForm = 'profile' | 'add-guardian' | { guardian: string } | null

const TITLE_ID = 'workspace-guardians'
const ADD_ID = 'guardians-add'
const REMOVED_ID = 'guardians-removed'
const editId = (gid: string) => `guardian-edit-${gid}`

export interface GuardiansSectionProps {
  studentId: string
  openForm: OpenForm
  onOpenFormChange: (form: OpenForm) => void
  /** The student is gone (a 404 on the guardians or on adding one). */
  onNotFound: () => void
}

/**
 * The Profile view's Guardians section (IA §2, FR-STU-03; T-M2.15 scopes 1–6): the student's guardians in insertion
 * order, each with Edit and Remove, and Add guardian (up to 10). Its loading and error states stay inside the section.
 * Writes update the cache entry in place; Remove asks first and cannot be undone. While any form of the page is open,
 * every trigger here is disabled.
 */
export function GuardiansSection({ studentId, openForm, onOpenFormChange, onNotFound }: GuardiansSectionProps) {
  const { t } = useTranslation('students')
  const queryClient = useQueryClient()
  const guardians = useGuardians(studentId)
  const remove = useRemoveGuardian(studentId)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [removedElsewhere, setRemovedElsewhere] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Guardian | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null)
  const focusTo = (id: string) => setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }))
  useEffect(() => {
    // A trigger that is gone (Add guardian at 10) leaves focus to the heading.
    if (focus) (document.getElementById(focus.id) ?? titleRef.current)?.focus()
  }, [focus])

  const notFound = guardians.error instanceof ApiError && guardians.error.status === 404
  useEffect(() => {
    if (notFound) onNotFound()
  }, [notFound, onNotFound])

  const locked = openForm !== null
  // The removed-elsewhere alert lasts until the next guardian action.
  const startAction = () => setRemovedElsewhere(false)
  const closeForm = (trigger: string) => (result: GuardianFormResult) => {
    onOpenFormChange(null)
    if (result) {
      toast.success(t(result.added ? 'guardians.added' : 'guardians.saved'))
      focusTo(editId(result.guardian.id))
    } else focusTo(trigger)
  }
  const formProps = {
    studentId,
    onReload: () => guardians.refetch(),
    onNotFound,
    onRemovedElsewhere: () => {
      onOpenFormChange(null)
      void guardians.refetch()
      setRemovedElsewhere(true)
      focusTo(REMOVED_ID)
    },
  }

  const confirmRemove = async (guardian: Guardian) => {
    setRemoveError(null)
    try {
      await remove.mutateAsync(guardian.id)
      // An answer that outlived the tutor's session toasts nothing and moves no focus (scope 8).
      if (!isTutorSession(queryClient)) return
      setRemoveOpen(false)
      toast.success(t('guardians.removed', { name: guardian.name }))
      focusTo(TITLE_ID)
    } catch {
      setRemoveError(t('guardians.removeFailed'))
    }
  }

  const list = guardians.data
  return (
    <section aria-labelledby={TITLE_ID} className={styles.guardians}>
      <h2 id={TITLE_ID} ref={titleRef} tabIndex={-1} className={styles.sectionTitle}>
        {t('guardians.title')}
      </h2>
      {removedElsewhere ? (
        <div id={REMOVED_ID} tabIndex={-1} className={styles.focusTarget}>
          <InlineAlert tone="warning" title={t('guardians.removedElsewhere')} />
        </div>
      ) : null}
      {list ? (
        <>
          {openForm === 'profile' ? <p className={styles.mutedText}>{t('account.editingHint')}</p> : null}
          {list.length > 0 ? (
            <ul className={styles.guardianList}>
              {list.map((guardian) => (
                <li key={guardian.id} className={styles.guardianItem}>
                  {typeof openForm === 'object' && openForm?.guardian === guardian.id ? (
                    <GuardianForm guardian={guardian} onClose={closeForm(editId(guardian.id))} {...formProps} />
                  ) : (
                    <GuardianView
                      guardian={guardian}
                      locked={locked}
                      onEdit={() => {
                        startAction()
                        onOpenFormChange({ guardian: guardian.id })
                      }}
                      onRemove={() => {
                        startAction()
                        setRemoveError(null)
                        setRemoveTarget(guardian)
                        setRemoveOpen(true)
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.mutedText}>{t('guardians.empty')}</p>
          )}
          {openForm === 'add-guardian' ? (
            <GuardianForm onClose={closeForm(ADD_ID)} {...formProps} />
          ) : list.length >= GUARDIANS_MAX ? (
            <p className={styles.mutedText}>{t('guardians.limit', { max: GUARDIANS_MAX })}</p>
          ) : (
            <div>
              <Button
                id={ADD_ID}
                variant="secondary"
                isDisabled={locked}
                onPress={() => {
                  startAction()
                  onOpenFormChange('add-guardian')
                }}
              >
                {t('guardians.add')}
              </Button>
            </div>
          )}
        </>
      ) : guardians.isError ? (
        <InlineAlert
          tone="danger"
          title={t('guardians.errorTitle')}
          action={
            <Button variant="secondary" onPress={() => void guardians.refetch()}>
              {t('guardians.retry')}
            </Button>
          }
        />
      ) : (
        <output aria-busy="true" aria-label={t('guardians.loading')} className={styles.skeletonRows}>
          <DelayedSkeleton>
            {Array.from({ length: 2 }, (_, i) => (
              <Skeleton key={i} shape="block" inlineSize="100%" blockSize="var(--size-control-lg)" />
            ))}
          </DelayedSkeleton>
        </output>
      )}
      <ConfirmDialog
        isOpen={removeOpen}
        title={t('guardians.removeTitle', { name: removeTarget?.name ?? '' })}
        description={t('guardians.removeDescription')}
        confirmLabel={t('guardians.removeConfirm')}
        cancelLabel={t('guardians.removeCancel')}
        isPending={remove.isPending}
        pendingLabel={t('guardians.removing')}
        onConfirm={() => void (removeTarget && confirmRemove(removeTarget))}
        onCancel={() => setRemoveOpen(false)}
      >
        {removeError ? <InlineAlert tone="danger" title={removeError} /> : null}
      </ConfirmDialog>
    </section>
  )
}

interface GuardianViewProps {
  guardian: Guardian
  locked: boolean
  onEdit: () => void
  onRemove: () => void
}

/** One guardian: the name (`h3`), the details and Edit / Remove (their names include the guardian's). */
function GuardianView({ guardian, locked, onEdit, onRemove }: GuardianViewProps) {
  const { t } = useTranslation('students')
  return (
    <>
      <h3 className={styles.guardianName}>{guardian.name}</h3>
      <DescriptionList
        emptyLabel={t('workspace.notAdded')}
        items={[
          { id: 'relationship', term: t('guardians.relationship'), description: guardian.relationship },
          {
            id: 'phone',
            term: t('guardians.phone'),
            description: guardian.phone ? (
              <ContactValue kind="phone" value={guardian.phone} label={t('guardians.phone')} />
            ) : null,
          },
          {
            id: 'email',
            term: t('guardians.email'),
            description: guardian.email ? (
              <ContactValue kind="email" value={guardian.email} label={t('guardians.email')} />
            ) : null,
          },
          {
            id: 'notes',
            term: t('guardians.notes'),
            description: guardian.notes ? <span className={styles.note}>{guardian.notes}</span> : null,
          },
        ]}
      />
      <div className={styles.stackedActions}>
        <Button
          id={editId(guardian.id)}
          variant="secondary"
          aria-label={t('guardians.editLabel', { name: guardian.name })}
          isDisabled={locked}
          onPress={onEdit}
        >
          {t('guardians.edit')}
        </Button>
        <Button
          variant="secondary"
          aria-label={t('guardians.removeLabel', { name: guardian.name })}
          isDisabled={locked}
          onPress={onRemove}
        >
          {t('guardians.remove')}
        </Button>
      </div>
    </>
  )
}
