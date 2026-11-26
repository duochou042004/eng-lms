import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useRevalidator } from 'react-router'
import { sessionQuery, useUpdatePreferences, type Session } from '../../../features/auth/api/session'
import { ApiError } from '../../../lib/api'
import { codePointLabel, firstForbidden } from '../../../lib/names'
import {
  Button,
  ButtonLink,
  ErrorSummary,
  InlineAlert,
  TextField,
  toast,
  UnsavedChangesGuard,
  type ErrorSummaryItem,
} from '../../../ui'
import { ComboBox } from '../../../ui/ComboBox'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import {
  accountSchema,
  accountValues,
  mapPreferencesErrors,
  timeZoneOptions,
  toPreferencesRequest,
  type AccountValues,
} from './accountForm'
import styles from './Account.module.css'
import './i18n'

const FIELD_IDS: Record<keyof AccountValues, string> = {
  displayName: 'account-display-name',
  timeZone: 'account-time-zone',
}

/**
 * The account form both roles use (FR-SET-02; T-M2.6 scope 5, shared since T-M2.7 so a student route never imports the
 * tutor's settings module): the Language row is the shell's `LanguageSwitcher` (it saves at once); then the fields of the
 * session's role (the tutor: Display name and Time zone; a student: Time zone only, a student's `displayName` is refused),
 * saved together by **Save**, which stays disabled (focusable, so focus survives a save) while the form equals the saved
 * values and sends only the changed properties. The session is read again on arrival, so another tab's change shows; a
 * failed read keeps the cached values under a warning with Retry. `header` replaces the form's own `h2` (the student
 * page's `h1` and name block).
 */
export function AccountPanel({ header }: { header?: ReactNode }) {
  const sessionRead = useQuery({ ...sessionQuery, staleTime: 0 })
  const session = sessionRead.data
  const revalidator = useRevalidator()
  // Signed out meanwhile (the read answered anonymous): the guards send the visitor to sign in.
  useEffect(() => {
    if (session === null) void revalidator.revalidate()
  }, [session, revalidator])
  if (!session) return null
  return (
    <AccountForm
      session={session}
      header={header}
      loadFailed={sessionRead.isError}
      onRetryLoad={() => void sessionRead.refetch()}
    />
  )
}

function AccountForm({
  session,
  header,
  loadFailed,
  onRetryLoad,
}: {
  session: Session
  header?: ReactNode
  loadFailed: boolean
  onRetryLoad: () => void
}) {
  const { t } = useTranslation('account')
  const headingId = useId()
  const save = useUpdatePreferences()
  const inFlight = useRef(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const [summaryShown, setSummaryShown] = useState(0)
  const [unknownError, setUnknownError] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  // The role's fields: a student's display name is not theirs to set (DEC-190; the server refuses it with a 422).
  const fields: readonly (keyof AccountValues)[] = session.role === 'TUTOR' ? ['displayName', 'timeZone'] : ['timeZone']
  const saved = useMemo(() => accountValues(session), [session])
  const options = useMemo(() => timeZoneOptions(saved.timeZone), [saved.timeZone])
  const resolver = useMemo(() => zodResolver(accountSchema(saved.displayName)), [saved.displayName])
  const { control, handleSubmit, setError, reset, getValues, setValue, formState } = useForm<AccountValues>({
    resolver,
    defaultValues: saved,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  // Another tab's save (read on arrival or on focus) updates only the fields not being edited.
  useEffect(() => {
    reset(saved, { keepDirtyValues: true })
  }, [saved, reset])
  const values = useWatch({ control }) as AccountValues
  // INVALID_CHARACTER names the client rule's code point (the server's problem `message` is for developers, T-M2.33).
  const forbidden = firstForbidden(values.displayName ?? '')
  const errorText = (key: string) => t(key, { codePoint: forbidden === null ? '' : codePointLabel(forbidden) })
  const changed = toPreferencesRequest(saved, values) !== null

  const errors = formState.errors
  const summaryItems: ErrorSummaryItem[] =
    summaryShown > 0
      ? [
          ...fields.flatMap((field) =>
            errors[field]?.message ? [{ message: errorText(errors[field].message), fieldId: FIELD_IDS[field] }] : [],
          ),
          ...(unknownError ? [{ message: t('account.errors.server') }] : []),
        ]
      : []
  // Focus the summary once per failed submit (interaction-states §2.3; UI rules: after a 422), on the first render that
  // shows it: a client failure's count can render before its errors (AC11 (a)). A later re-show while typing never moves focus.
  const failed = () => setSummaryShown((n) => n + 1)
  const summaryRendered = summaryItems.length > 0
  const focusedFor = useRef(0)
  useEffect(() => {
    if (summaryShown === 0) focusedFor.current = 0
    else if (summaryRendered && summaryShown > focusedFor.current) {
      focusedFor.current = summaryShown
      summaryRef.current?.focus()
    }
  }, [summaryShown, summaryRendered])

  const submit = handleSubmit(async (form) => {
    const body = toPreferencesRequest(saved, form)
    if (!body) return
    setFormError(null)
    setUnknownError(false)
    try {
      const answer = await save.mutateAsync(body)
      // What was typed while saving stays, and dirty (AC11 (b)); the fields sent show the answer.
      const current = getValues()
      reset(accountValues(answer))
      for (const field of fields)
        if (current[field] !== form[field]) setValue(field, current[field], { shouldDirty: true })
      setSummaryShown(0)
      toast.success(t('account.saved'))
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        const mapped = mapPreferencesErrors(error.fieldErrors)
        for (const { path, message } of mapped.fields) setError(path, { type: 'server', message })
        setUnknownError(mapped.unknown || mapped.fields.length === 0)
        failed()
      } else if (error instanceof ApiError && error.status !== 0) {
        setFormError(t('account.serverError'))
      } else {
        setFormError(t('account.networkError'))
      }
    }
  }, failed)
  // No double submit: a second click or Enter waits for the first to settle.
  const send = () => {
    if (inFlight.current || !changed) return
    inFlight.current = true
    void submit().finally(() => {
      inFlight.current = false
    })
  }

  return (
    <section aria-labelledby={header ? undefined : headingId} className={styles.column}>
      {header ?? (
        <h2 id={headingId} className={styles.heading}>
          {t('account.heading')}
        </h2>
      )}
      {loadFailed ? (
        <InlineAlert
          tone="warning"
          title={t('account.loadError')}
          action={
            <Button variant="secondary" onPress={onRetryLoad}>
              {t('account.retry')}
            </Button>
          }
        />
      ) : null}
      <div className={styles.language}>
        <LanguageSwitcher labelVisible />
      </div>
      <form
        noValidate
        className={styles.form}
        aria-label={t('account.formLabel')}
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <ErrorSummary ref={summaryRef} title={t('account.summaryTitle')} errors={summaryItems} />
        {fields.includes('displayName') ? (
          <Controller
            control={control}
            name="displayName"
            render={({ field, fieldState }) => (
              <TextField
                id={FIELD_IDS.displayName}
                label={t('account.displayName')}
                hint={t('account.displayNameHint')}
                autoComplete="name"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                isInvalid={fieldState.invalid}
                errorMessage={fieldState.error?.message ? errorText(fieldState.error.message) : undefined}
              />
            )}
          />
        ) : null}
        <Controller
          control={control}
          name="timeZone"
          render={({ field, fieldState }) => (
            <ComboBox
              id={FIELD_IDS.timeZone}
              label={t('account.timeZone')}
              description={t('account.timeZoneHint')}
              options={options}
              value={field.value}
              onChange={field.onChange}
              emptyMessage={t('account.timeZoneEmpty')}
              buttonLabel={t('account.timeZoneShow')}
              listLabel={t('account.timeZoneList')}
              isInvalid={fieldState.invalid}
              errorMessage={fieldState.error?.message ? errorText(fieldState.error.message) : undefined}
            />
          )}
        />
        {formError ? (
          <InlineAlert
            tone="danger"
            title={formError}
            action={
              <Button variant="secondary" isDisabled={save.isPending} onPress={send}>
                {t('account.retry')}
              </Button>
            }
          />
        ) : null}
        <div>
          <Button type="submit" isPending={save.isPending} aria-disabled={changed ? undefined : true}>
            {save.isPending ? t('account.saving') : t('account.save')}
          </Button>
        </div>
      </form>
      <p className={styles.password}>
        {t('account.passwordHint')}
        <ButtonLink variant="secondary" to="/change-password">
          {t('account.changePassword')}
        </ButtonLink>
      </p>
      <UnsavedChangesGuard
        isDirty={changed}
        title={t('account.discardTitle')}
        description={t('account.discardDescription')}
        confirmLabel={t('account.discard')}
        cancelLabel={t('account.keepEditing')}
      />
    </section>
  )
}
