import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useRevalidator } from 'react-router'
import { sessionQuery, useUpdatePreferences, type Session } from '../../../features/auth/api/session'
import { ApiError } from '../../../lib/api'
import { usePageTitle } from '../../../lib/i18n/pageTitle'
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
import './i18n'
import styles from './Settings.module.css'

const FIELD_IDS: Record<keyof AccountValues, string> = {
  displayName: 'account-display-name',
  timeZone: 'account-time-zone',
}

/**
 * `/tutor/settings/account` (FR-SET-02, T-M2.6 scope 5): the Language row is the shell's `LanguageSwitcher` (it saves
 * at once); then Display name and Time zone, saved together by **Save**, which stays disabled (focusable, so focus
 * survives a save) while the form equals the saved values and sends only the changed properties. The session is read
 * again on arrival, so another tab's change shows; a failed read keeps the cached values under a warning with Retry.
 */
export function AccountSettingsPage() {
  const { t } = useTranslation('settings')
  usePageTitle(t('account.pageTitle'))
  const sessionRead = useQuery({ ...sessionQuery, staleTime: 0 })
  const session = sessionRead.data
  const revalidator = useRevalidator()
  // Signed out meanwhile (the read answered anonymous): the guards send the visitor to sign in.
  useEffect(() => {
    if (session === null) void revalidator.revalidate()
  }, [session, revalidator])
  if (!session) return null
  return (
    <AccountForm session={session} loadFailed={sessionRead.isError} onRetryLoad={() => void sessionRead.refetch()} />
  )
}

function AccountForm({
  session,
  loadFailed,
  onRetryLoad,
}: {
  session: Session
  loadFailed: boolean
  onRetryLoad: () => void
}) {
  const { t } = useTranslation('settings')
  const headingId = useId()
  const save = useUpdatePreferences()
  const inFlight = useRef(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const [summaryShown, setSummaryShown] = useState(0)
  const [unknownError, setUnknownError] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const saved = useMemo(() => accountValues(session), [session])
  const options = useMemo(() => timeZoneOptions(saved.timeZone), [saved.timeZone])
  const { control, handleSubmit, setError, reset, formState } = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: saved,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  // Another tab's save (read on arrival or on focus) updates only the fields not being edited.
  useEffect(() => reset(saved, { keepDirtyValues: true }), [saved, reset])
  const values = useWatch({ control }) as AccountValues
  const changed = toPreferencesRequest(saved, values) !== null

  const errors = formState.errors
  const summaryItems: ErrorSummaryItem[] =
    summaryShown > 0
      ? [
          ...(['displayName', 'timeZone'] as const).flatMap((field) =>
            errors[field]?.message ? [{ message: t(errors[field].message), fieldId: FIELD_IDS[field] }] : [],
          ),
          ...(unknownError ? [{ message: t('account.errors.server') }] : []),
        ]
      : []
  // Focus the summary once per failed submit (interaction-states §2.3; UI rules: after a 422).
  useEffect(() => {
    if (summaryShown > 0) summaryRef.current?.focus()
  }, [summaryShown])

  const submit = handleSubmit(
    async (form) => {
      const body = toPreferencesRequest(saved, form)
      if (!body) return
      setFormError(null)
      setUnknownError(false)
      try {
        const answer = await save.mutateAsync(body)
        reset(accountValues(answer))
        setSummaryShown(0)
        toast.success(t('account.saved'))
      } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
          const mapped = mapPreferencesErrors(error.fieldErrors)
          for (const { path, message } of mapped.fields) setError(path, { type: 'server', message })
          setUnknownError(mapped.unknown || mapped.fields.length === 0)
          setSummaryShown((n) => n + 1)
        } else if (error instanceof ApiError && error.status !== 0) {
          setFormError(t('account.serverError'))
        } else {
          setFormError(t('account.networkError'))
        }
      }
    },
    () => setSummaryShown((n) => n + 1),
  )
  // No double submit: a second click or Enter waits for the first to settle.
  const send = () => {
    if (inFlight.current || !changed) return
    inFlight.current = true
    void submit().finally(() => {
      inFlight.current = false
    })
  }

  return (
    <section aria-labelledby={headingId} className={styles.column}>
      <h2 id={headingId} className={styles.heading}>
        {t('account.heading')}
      </h2>
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
      <LanguageSwitcher />
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
              errorMessage={fieldState.error?.message ? t(fieldState.error.message) : undefined}
            />
          )}
        />
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
              isInvalid={fieldState.invalid}
              errorMessage={fieldState.error?.message ? t(fieldState.error.message) : undefined}
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
