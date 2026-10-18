import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../../lib/api'
import {
  Button,
  ButtonLink,
  Disclosure,
  ErrorSummary,
  InlineAlert,
  PasswordField,
  UnsavedChangesGuard,
  type ErrorSummaryItem,
} from '../../../ui'
import { useCreateStudent, useUsernameSuggestion, type CreatedStudent } from '../api/students'
import {
  canSuggest,
  createStudentSchema,
  EMPTY_STUDENT,
  toCreateRequest,
  type CreateStudentValues,
} from '../model/createSchema'
import { mapServerErrors } from '../model/serverErrors'
import { DEBOUNCE_MS, fieldId, summaryOf } from '../model/studentFields'
import { useSummaryFocus } from '../model/useSummaryFocus'
import { useDebounced } from '../model/useDebounced'
import { ContactFields, FullNameField, NoteField, UsernameField } from './StudentFields'
import styles from './Students.module.css'
import { useUsernameCheck } from './useUsernameCheck'

type Section = 'password' | 'contact' | 'note'

export interface AddStudentFormProps {
  onCreated: (created: CreatedStudent) => void
  /** Focus the first field when shown again ("Add another student"). */
  focusFirstField?: boolean
}

/**
 * The Add student form (FR-STU-01, ux-flows F2; T-M2.5 scope 4): Full name and Username (suggested from the name and
 * checked for availability), then the collapsed optional Password, Contact and Note sections. Client checks on submit
 * (then on change); server errors on their fields, the rest in the error summary, which takes focus; a taken username
 * focuses the field; a network or server failure keeps every input. Leaving the dirty form in-app asks first, closing the
 * tab warns (`UnsavedChangesGuard`).
 */
export function AddStudentForm({ onCreated, focusFirstField = false }: AddStudentFormProps) {
  const { t } = useTranslation('students')
  const create = useCreateStudent()
  const inFlight = useRef(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [unknownErrors, setUnknownErrors] = useState<string[]>([])
  const [summaryShown, setSummaryShown] = useState(false)
  const [open, setOpen] = useState<Record<Section, boolean>>({ password: false, contact: false, note: false })
  const {
    control,
    handleSubmit,
    setValue,
    setError,
    getValues,
    formState: { errors, isDirty, isSubmitted },
  } = useForm<CreateStudentValues>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: EMPTY_STUDENT,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })

  useEffect(() => {
    if (focusFirstField) document.getElementById(fieldId.fullName)?.focus()
  }, [focusFirstField])

  // --- Username: suggested from the name until the tutor edits it; its availability follows what is typed. -------------
  const fullName = useWatch({ control, name: 'fullName' }).trim()
  const [usernameEdited, setUsernameEdited] = useState(false)
  const suggestFor = useDebounced(fullName, DEBOUNCE_MS)
  // Only a name with ≥ 3 letters or digits is sent, so the server's `student` fallback never fills the field.
  const suggestion = useUsernameSuggestion(suggestFor, !usernameEdited && canSuggest(suggestFor))
  useEffect(() => {
    if (usernameEdited) return
    if (!canSuggest(fullName)) {
      if (getValues('username') !== '') setValue('username', '', { shouldDirty: true })
      return
    }
    // The answer belongs to its name (the query key): written only when that name is still the one typed.
    if (suggestion.data !== undefined && suggestFor === fullName && getValues('username') !== suggestion.data) {
      setValue('username', suggestion.data, { shouldDirty: true, shouldValidate: isSubmitted })
    }
  }, [usernameEdited, fullName, suggestFor, suggestion.data, getValues, setValue, isSubmitted])
  const availability = useUsernameCheck(control, errors.username?.type === 'server')

  // --- Submit. -------------------------------------------------------------------------------------------------------
  const summaryItems: ErrorSummaryItem[] = summaryShown
    ? [...summaryOf(errors, t), ...unknownErrors.map((m) => ({ message: t(m) }))]
    : []
  const summaryRef = useRef<HTMLDivElement>(null)
  const requestSummaryFocus = useSummaryFocus(summaryRef, summaryItems.length > 0)
  // A section that holds an error opens, so its fields (and the summary's links to them) can be reached.
  const expandFor = (names: readonly string[]) =>
    setOpen((current) => ({
      password: current.password || names.includes('password'),
      contact: current.contact || names.some((n) => ['email', 'phone', 'contactHandles'].includes(n)),
      note: current.note || names.includes('note'),
    }))
  const showSummary = (names: readonly string[]) => {
    expandFor(names)
    setSummaryShown(true)
    requestSummaryFocus()
  }

  const submit = handleSubmit(
    async (values) => {
      setFormError(null)
      setUnknownErrors([])
      try {
        const created = await create.mutateAsync(toCreateRequest(values))
        // The credentials move to the page's state; the mutation (and its cache entry, gcTime 0) is dropped.
        create.reset()
        onCreated(created)
      } catch (error) {
        if (!(error instanceof ApiError) || error.status === 0) {
          setFormError(t('form.networkError'))
        } else if (error.status === 409 && error.code === 'USERNAME_TAKEN') {
          setError('username', { type: 'server', message: 'form.errors.USERNAME_TAKEN' })
          // The earlier "Available" is out of date: ask again, so the field says Taken once the tutor edits it.
          availability.refetch()
          setSummaryShown(false)
          document.getElementById(fieldId.username)?.focus()
        } else if (error.status === 422) {
          const mapped = mapServerErrors(error.fieldErrors, values.contactHandles.length)
          for (const { path, message } of mapped.fields) setError(path, { type: 'server', message })
          setUnknownErrors(mapped.unknown)
          showSummary(mapped.fields.map((f) => f.path.split('.')[0]!))
        } else {
          setFormError(t('form.serverError'))
        }
      }
    },
    (fieldErrors) => showSummary(Object.keys(fieldErrors)),
  )

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
        aria-label={t('form.title')}
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <ErrorSummary ref={summaryRef} title={t('form.summaryTitle')} errors={summaryItems} />
        <FullNameField control={control} />
        <UsernameField
          control={control}
          hint={t('form.usernameHint')}
          availability={availability.state}
          onEdited={() => setUsernameEdited(true)}
        />

        <Disclosure
          title={t('form.passwordSection')}
          isExpanded={open.password}
          onExpandedChange={(password) => setOpen((o) => ({ ...o, password }))}
        >
          <div className={styles.form}>
            <p className={styles.mutedText}>{t('form.passwordGenerated')}</p>
            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => (
                <PasswordField
                  id={fieldId.password}
                  label={t('form.password')}
                  hint={t('form.passwordHint')}
                  revealLabel={t('form.showPassword')}
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  autoComplete="new-password"
                  validationBehavior="aria"
                  isInvalid={fieldState.invalid}
                  errorMessage={fieldState.error?.message ? t(fieldState.error.message) : undefined}
                />
              )}
            />
          </div>
        </Disclosure>

        <Disclosure
          title={t('form.contactSection')}
          isExpanded={open.contact}
          onExpandedChange={(contact) => setOpen((o) => ({ ...o, contact }))}
        >
          <ContactFields control={control} />
        </Disclosure>

        <Disclosure
          title={t('form.noteSection')}
          isExpanded={open.note}
          onExpandedChange={(note) => setOpen((o) => ({ ...o, note }))}
        >
          <NoteField control={control} />
        </Disclosure>

        {formError ? <InlineAlert tone="danger" title={formError} /> : null}
        <div className={styles.actions}>
          <Button type="submit" isPending={create.isPending}>
            {create.isPending ? t('form.creating') : t('form.create')}
          </Button>
          <ButtonLink variant="quiet" to="/tutor/students">
            {t('form.cancel')}
          </ButtonLink>
        </div>
      </form>
      <UnsavedChangesGuard
        isDirty={isDirty}
        title={t('form.discardTitle')}
        description={t('form.discardDescription')}
        confirmLabel={t('form.discard')}
        cancelLabel={t('form.keepEditing')}
      />
    </>
  )
}
