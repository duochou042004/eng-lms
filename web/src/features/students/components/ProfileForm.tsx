import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../../lib/api'
import { formatDate } from '../../../lib/time'
import {
  Button,
  ConfirmDialog,
  DescriptionList,
  ErrorSummary,
  InlineAlert,
  UnsavedChangesGuard,
  type ErrorSummaryItem,
} from '../../../ui'
import { useUpdateStudent, type Student } from '../api/students'
import { isTutorSession } from '../api/tutorSession'
import { editStudentSchema, toEditValues, toPatchRequest, type EditStudentValues } from '../model/editSchema'
import { mapServerErrors, type StudentFieldPath } from '../model/serverErrors'
import { fieldId, summaryOf } from '../model/studentFields'
import { useSummaryFocus } from '../model/useSummaryFocus'
import { ConflictDialog } from './ConflictDialog'
import { ContactFields, FullNameField, NoteField, UsernameField } from './StudentFields'
import styles from './Students.module.css'
import { useUsernameCheck } from './useUsernameCheck'

export interface ProfileFormProps {
  student: Student
  /** The form closes: after a save (`saved`), a Cancel or a Save with nothing changed. */
  onClose: (saved: boolean) => void
  /** Reload of the conflict dialog: refetch the student (the form is discarded and closed afterwards). */
  onReload: () => Promise<unknown>
  /** The student is gone (404). */
  onNotFound: () => void
}

/**
 * Edit profile (FR-STU-03, T-M2.14 scopes 1–4): the Personal information, Contacts and Note fields as one form, with
 * the add form's rules (`editStudentSchema`) and shared fields. Save sends only the changed fields with the version
 * the form was opened with; a 409 `STALE_VERSION` opens the conflict dialog; a taken username focuses Username; other
 * failures as in the add form. Leaving or cancelling with changes asks first.
 */
export function ProfileForm({ student, onClose, onReload, onNotFound }: ProfileFormProps) {
  const { t, i18n } = useTranslation('students')
  const queryClient = useQueryClient()
  const update = useUpdateStudent(student.id)
  const inFlight = useRef(false)
  // The values and the version the form was opened with: the base of the change set and of the conflict check.
  const [initial] = useState(() => toEditValues(student))
  const [version] = useState(student.version)
  const [formError, setFormError] = useState<string | null>(null)
  const [unknownErrors, setUnknownErrors] = useState<string[]>([])
  const [summaryShown, setSummaryShown] = useState(false)
  const [conflict, setConflict] = useState<{ note?: string } | null>(null)
  const [askDiscard, setAskDiscard] = useState(false)
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<EditStudentValues>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: initial,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const availability = useUsernameCheck(control, errors.username?.type === 'server', initial.username.trim())

  useEffect(() => document.getElementById(fieldId.fullName)?.focus(), [])

  const summaryItems: ErrorSummaryItem[] = summaryShown
    ? [...summaryOf(errors, t), ...unknownErrors.map((m) => ({ message: t(m) }))]
    : []
  const summaryRef = useRef<HTMLDivElement>(null)
  const requestSummaryFocus = useSummaryFocus(summaryRef, summaryItems.length > 0)
  const showSummary = () => {
    setSummaryShown(true)
    requestSummaryFocus()
  }

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    setUnknownErrors([])
    const body = toPatchRequest(initial, values, version)
    if (!body) return onClose(false)
    try {
      await update.mutateAsync(body)
      // An answer that outlived the tutor's session closes nothing, toasts nothing (scope 8).
      if (isTutorSession(queryClient)) onClose(true)
    } catch (error) {
      if (!(error instanceof ApiError) || error.status === 0) {
        setFormError(t('profile.networkError'))
      } else if (error.status === 409 && error.code === 'USERNAME_TAKEN') {
        setError('username', { type: 'server', message: 'form.errors.USERNAME_TAKEN' })
        availability.refetch()
        setSummaryShown(false)
        document.getElementById(fieldId.username)?.focus()
      } else if (error.status === 409 && error.code === 'STALE_VERSION') {
        setConflict({ note: 'note' in body ? values.note : undefined })
      } else if (error.status === 422) {
        const mapped = mapServerErrors(error.fieldErrors, values.contactHandles.length)
        for (const { path, message } of mapped.fields)
          if (path !== 'password') setError(path as Exclude<StudentFieldPath, 'password'>, { type: 'server', message })
        setUnknownErrors(mapped.unknown)
        showSummary()
      } else if (error.status === 404) {
        onNotFound()
      } else {
        setFormError(t('profile.serverError'))
      }
    }
  }, showSummary)

  // No double submit: a second click or Enter waits for the first to settle.
  const send = () => {
    if (inFlight.current) return
    inFlight.current = true
    void submit().finally(() => {
      inFlight.current = false
    })
  }

  return (
    <>
      <form
        noValidate
        className={styles.form}
        aria-label={t('profile.formLabel')}
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <ErrorSummary ref={summaryRef} title={t('profile.summaryTitle')} errors={summaryItems} />
        <DescriptionList
          emptyLabel={t('workspace.notAdded')}
          items={[
            { id: 'addedOn', term: t('workspace.addedOn'), description: formatDate(student.createdAt, i18n.language) },
          ]}
        />
        <FullNameField control={control} />
        <UsernameField control={control} hint={t('profile.usernameHint')} availability={availability.state} />
        <h3 className={styles.subTitle}>{t('workspace.contacts')}</h3>
        <ContactFields control={control} handlesHeadingLevel={4} />
        <NoteField control={control} />
        {formError ? <InlineAlert tone="danger" title={formError} /> : null}
        <div className={styles.stackedActions}>
          <Button type="submit" isPending={update.isPending}>
            {update.isPending ? t('profile.saving') : t('profile.save')}
          </Button>
          <Button
            variant="quiet"
            isDisabled={update.isPending}
            onPress={() => (isDirty ? setAskDiscard(true) : onClose(false))}
          >
            {t('profile.cancel')}
          </Button>
        </div>
      </form>
      <UnsavedChangesGuard
        isDirty={isDirty}
        title={t('profile.discardTitle')}
        description={t('profile.discardDescription')}
        confirmLabel={t('profile.discard')}
        cancelLabel={t('profile.keepEditing')}
      />
      <ConfirmDialog
        isOpen={askDiscard}
        title={t('profile.discardTitle')}
        description={t('profile.discardDescription')}
        confirmLabel={t('profile.discard')}
        cancelLabel={t('profile.keepEditing')}
        onConfirm={() => {
          setAskDiscard(false)
          onClose(false)
        }}
        onCancel={() => setAskDiscard(false)}
      />
      <ConflictDialog
        isOpen={conflict !== null}
        description={t('conflict.description')}
        copy={conflict?.note !== undefined ? { text: conflict.note, label: t('conflict.copyNote') } : undefined}
        onCancel={() => setConflict(null)}
        onReload={() => {
          setConflict(null)
          void onReload().finally(() => onClose(false))
        }}
      />
    </>
  )
}
