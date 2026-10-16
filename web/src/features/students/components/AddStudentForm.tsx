import { zodResolver } from '@hookform/resolvers/zod'
import type { TFunction } from 'i18next'
import { CircleAlert, CircleCheck, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch, type FieldErrors } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useBlocker } from 'react-router'
import { ApiError } from '../../../lib/api'
import {
  Button,
  ButtonLink,
  ConfirmDialog,
  Disclosure,
  ErrorSummary,
  InlineAlert,
  PasswordField,
  TextArea,
  TextField,
  type ErrorSummaryItem,
} from '../../../ui'
import { useCreateStudent, useUsernameAvailability, useUsernameSuggestion, type CreatedStudent } from '../api/students'
import {
  canSuggest,
  createStudentSchema,
  EMAIL_MAX,
  EMPTY_STUDENT,
  FULL_NAME_MAX,
  HANDLE_LABEL_MAX,
  HANDLE_VALUE_MAX,
  HANDLES_MAX,
  NOTE_MAX,
  toCreateRequest,
  type CreateStudentValues,
} from '../model/createSchema'
import { mapServerErrors } from '../model/serverErrors'
import { useDebounced } from '../model/useDebounced'
import styles from './Students.module.css'

const DEBOUNCE_MS = 300
const ADD_HANDLE_ID = 'student-add-handle'
const id = {
  fullName: 'student-fullName',
  username: 'student-username',
  password: 'student-password',
  email: 'student-email',
  phone: 'student-phone',
  note: 'student-note',
  handle: (index: number, part: 'label' | 'value') => `student-handle-${index}-${part}`,
}
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
 * tab warns; sign-out and role redirects (`/login`, `/forbidden`) are never blocked.
 */
export function AddStudentForm({ onCreated, focusFirstField = false }: AddStudentFormProps) {
  const { t } = useTranslation('students')
  const create = useCreateStudent()
  const inFlight = useRef(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [unknownErrors, setUnknownErrors] = useState<string[]>([])
  const [summaryShown, setSummaryShown] = useState(false)
  const [focusSummary, setFocusSummary] = useState(0)
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
  const handles = useFieldArray({ control, name: 'contactHandles' })

  useEffect(() => {
    if (focusFirstField) document.getElementById(id.fullName)?.focus()
  }, [focusFirstField])

  // --- Username: suggested from the name until the tutor edits it; its availability follows what is typed. -------------
  const fullName = useWatch({ control, name: 'fullName' }).trim()
  const username = useWatch({ control, name: 'username' }).trim()
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

  const checkFor = useDebounced(username, DEBOUNCE_MS)
  const availability = useUsernameAvailability(checkFor, checkFor !== '')
  // An answer counts only for the username currently typed; anything older shows nothing.
  const availabilityState =
    username === '' || errors.username?.type === 'server'
      ? null
      : checkFor !== username || availability.isPending
        ? 'checking'
        : availability.isError
          ? null
          : availability.data.available
            ? 'available'
            : availability.data.reason === 'TAKEN'
              ? 'taken'
              : 'invalid'

  // --- Leaving: the unsaved changes guard (interaction-states §2.6). ------------------------------------------------------
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      nextLocation.pathname !== currentLocation.pathname &&
      !['/login', '/forbidden'].includes(nextLocation.pathname),
  )
  useEffect(() => {
    if (!isDirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isDirty])

  // --- Submit. -------------------------------------------------------------------------------------------------------
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
    setFocusSummary((n) => n + 1)
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
          setSummaryShown(false)
          document.getElementById(id.username)?.focus()
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

  const summaryItems: ErrorSummaryItem[] = summaryShown
    ? [...summaryOf(errors, t), ...unknownErrors.map((m) => ({ message: t(m) }))]
    : []
  const hasSummary = summaryItems.length > 0
  const focusedFor = useRef(0)
  useEffect(() => {
    if (hasSummary && focusSummary > focusedFor.current) {
      focusedFor.current = focusSummary
      summaryRef.current?.focus()
    }
  }, [focusSummary, hasSummary])

  // A new contact row: focus its first field. A removed one: focus "Add a contact".
  const handleCount = useRef(handles.fields.length)
  useEffect(() => {
    const before = handleCount.current
    handleCount.current = handles.fields.length
    if (handles.fields.length > before) document.getElementById(id.handle(handles.fields.length - 1, 'label'))?.focus()
    else if (handles.fields.length < before) document.getElementById(ADD_HANDLE_ID)?.focus()
  }, [handles.fields.length])

  const message = (text: string | undefined, max?: number) => (text ? t(text, { max }) : undefined)
  const required = (label: string) => `${label} ${t('form.required')}`

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
        <Controller
          name="fullName"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              id={id.fullName}
              label={required(t('form.fullName'))}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              autoComplete="off"
              isRequired
              validationBehavior="aria"
              isInvalid={fieldState.invalid}
              errorMessage={message(fieldState.error?.message, FULL_NAME_MAX)}
            />
          )}
        />
        <div>
          <Controller
            name="username"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                id={id.username}
                label={required(t('form.username'))}
                hint={t('form.usernameHint')}
                name={field.name}
                value={field.value}
                onChange={(value) => {
                  setUsernameEdited(true)
                  field.onChange(value)
                }}
                onBlur={field.onBlur}
                autoComplete="off"
                spellCheck="false"
                isRequired
                validationBehavior="aria"
                isInvalid={fieldState.invalid}
                errorMessage={message(fieldState.error?.message)}
              />
            )}
          />
          <output className={styles.availability} data-tone={availabilityTone(availabilityState)}>
            {availabilityState === 'available' ? (
              <CircleCheck aria-hidden="true" className={styles.availabilityIcon} />
            ) : availabilityState === 'taken' || availabilityState === 'invalid' ? (
              <CircleAlert aria-hidden="true" className={styles.availabilityIcon} />
            ) : null}
            {availabilityState ? t(`form.${availabilityState}`) : null}
          </output>
        </div>

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
                  id={id.password}
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
                  errorMessage={message(fieldState.error?.message)}
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
          <div className={styles.form}>
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  id={id.email}
                  label={t('form.email')}
                  type="email"
                  inputMode="email"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  autoComplete="off"
                  validationBehavior="aria"
                  isInvalid={fieldState.invalid}
                  errorMessage={message(fieldState.error?.message, EMAIL_MAX)}
                />
              )}
            />
            <Controller
              name="phone"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  id={id.phone}
                  label={t('form.phone')}
                  type="tel"
                  inputMode="tel"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  autoComplete="off"
                  validationBehavior="aria"
                  isInvalid={fieldState.invalid}
                  errorMessage={message(fieldState.error?.message)}
                />
              )}
            />
            <div className={styles.form}>
              <div>
                <h3 className={styles.legend}>{t('form.handlesTitle')}</h3>
                <p className={styles.mutedText}>{t('form.handlesHint')}</p>
              </div>
              {handles.fields.length > 0 ? (
                <ul className={styles.handles}>
                  {handles.fields.map((row, index) => (
                    <li key={row.id}>
                      <fieldset className={styles.handle}>
                        <legend className={styles.legend}>{t('form.handleLegend', { number: index + 1 })}</legend>
                        <Controller
                          name={`contactHandles.${index}.label`}
                          control={control}
                          render={({ field, fieldState }) => (
                            <TextField
                              id={id.handle(index, 'label')}
                              label={required(t('form.handleLabel'))}
                              name={field.name}
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              autoComplete="off"
                              isRequired
                              validationBehavior="aria"
                              isInvalid={fieldState.invalid}
                              errorMessage={message(fieldState.error?.message, HANDLE_LABEL_MAX)}
                            />
                          )}
                        />
                        <Controller
                          name={`contactHandles.${index}.value`}
                          control={control}
                          render={({ field, fieldState }) => (
                            <TextField
                              id={id.handle(index, 'value')}
                              label={t('form.handleValue')}
                              name={field.name}
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              autoComplete="off"
                              spellCheck="false"
                              validationBehavior="aria"
                              isInvalid={fieldState.invalid}
                              errorMessage={message(fieldState.error?.message, HANDLE_VALUE_MAX)}
                            />
                          )}
                        />
                        <div className={styles.handleRemove}>
                          <Button variant="quiet" onPress={() => handles.remove(index)}>
                            <Trash2 aria-hidden="true" className={styles.icon} />
                            {t('form.removeHandle', { number: index + 1 })}
                          </Button>
                        </div>
                      </fieldset>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div>
                <Button
                  id={ADD_HANDLE_ID}
                  variant="secondary"
                  isDisabled={handles.fields.length >= HANDLES_MAX}
                  onPress={() => handles.append({ label: '', value: '' }, { shouldFocus: false })}
                >
                  <Plus aria-hidden="true" className={styles.icon} />
                  {t('form.addHandle')}
                </Button>
              </div>
              {handles.fields.length >= HANDLES_MAX ? (
                <p className={styles.mutedText}>{t('form.handlesFull', { max: HANDLES_MAX })}</p>
              ) : null}
            </div>
          </div>
        </Disclosure>

        <Disclosure
          title={t('form.noteSection')}
          isExpanded={open.note}
          onExpandedChange={(note) => setOpen((o) => ({ ...o, note }))}
        >
          <Controller
            name="note"
            control={control}
            render={({ field, fieldState }) => (
              <TextArea
                id={id.note}
                label={t('form.note')}
                hint={t('form.noteHint')}
                maxLength={NOTE_MAX}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                validationBehavior="aria"
                isInvalid={fieldState.invalid}
                errorMessage={message(fieldState.error?.message, NOTE_MAX)}
              />
            )}
          />
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
      <ConfirmDialog
        isOpen={blocker.state === 'blocked'}
        title={t('form.discardTitle')}
        description={t('form.discardDescription')}
        confirmLabel={t('form.discard')}
        cancelLabel={t('form.keepEditing')}
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </>
  )
}

function availabilityTone(state: string | null) {
  if (state === 'available') return 'success'
  if (state === 'taken' || state === 'invalid') return 'danger'
  return undefined
}

const MAX: Record<string, number> = {
  fullName: FULL_NAME_MAX,
  email: EMAIL_MAX,
  note: NOTE_MAX,
}

/** The summary's entries in the form's order, each a link to its field. */
function summaryOf(errors: FieldErrors<CreateStudentValues>, t: TFunction<'students'>) {
  const items: ErrorSummaryItem[] = []
  const add = (fieldId: string, text: string | undefined, max?: number) => {
    if (text) items.push({ fieldId, message: t(text, { max }) })
  }
  add(id.fullName, errors.fullName?.message, MAX.fullName)
  add(id.username, errors.username?.message)
  add(id.password, errors.password?.message)
  add(id.email, errors.email?.message, MAX.email)
  add(id.phone, errors.phone?.message)
  errors.contactHandles?.forEach?.((row, index) => {
    add(id.handle(index, 'label'), row?.label?.message, HANDLE_LABEL_MAX)
    add(id.handle(index, 'value'), row?.value?.message, HANDLE_VALUE_MAX)
  })
  if (errors.contactHandles?.root?.message) items.push({ message: t(errors.contactHandles.root.message) })
  else if (errors.contactHandles?.message) items.push({ message: t(errors.contactHandles.message) })
  add(id.note, errors.note?.message, MAX.note)
  return items
}
