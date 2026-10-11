import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { refreshSession, useChangePassword, useLogout, useSession } from '../../features/auth/api/session'
import { roleHome, safeNext } from '../../features/auth/model/redirect'
import { changePasswordSchema, type ChangePasswordValues } from '../../features/auth/model/schemas'
import { ApiError } from '../../lib/api'
import { Button, ErrorSummary, InlineAlert, PageHeader, PasswordField, Stack, type ErrorSummaryItem } from '../../ui'
import { PublicPage } from '../components/PublicPage'
import { usePageTitle } from '../routeAnnouncement'
import styles from './Page.module.css'

type FieldName = keyof ChangePasswordValues
const FIELDS: readonly FieldName[] = ['currentPassword', 'newPassword', 'confirmPassword']
const FIELD_IDS: Record<FieldName, string> = {
  currentPassword: 'password-current',
  newPassword: 'password-new',
  confirmPassword: 'password-confirm',
}
// The server's field codes for POST /auth/password (api-catalog "auth"); each has its own message.
const SERVER_CODES = new Set([
  'CURRENT_PASSWORD_INCORRECT',
  'PASSWORD_TOO_SHORT',
  'PASSWORD_TOO_LONG',
  'PASSWORD_TOO_COMMON',
  'PASSWORD_EQUALS_USERNAME',
  'PASSWORD_UNCHANGED',
])

/**
 * `/change-password` (FR-AUTH-05, FR-AUTH-06; T-M2.4 scope 6). Forced mode (the session must change its password):
 * an explanation, no cancel, and on success the session is read again and the user goes to the safe `?next=` of their
 * role or their home. Voluntary mode (from the shell header): Cancel goes back, and success confirms that the other
 * devices were signed out. Client checks (Zod) and the server's field codes show on their fields; a failed submit shows
 * the error summary and moves focus to it (interaction-states §2.3).
 */
export function ChangePasswordPage() {
  const { t } = useTranslation('auth')
  usePageTitle(t('changePassword.title'))
  const session = useSession().data
  const forced = session?.mustChangePassword ?? false
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const change = useChangePassword()
  const logout = useLogout()
  const inFlight = useRef(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLDivElement>(null)
  const [summaryShown, setSummaryShown] = useState(false)
  const [focusSummary, setFocusSummary] = useState(0)
  const [formError, setFormError] = useState<string | null>(null)
  const [changed, setChanged] = useState(false)
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    // UX-5: no "required" errors from tabbing through; first checked on submit, then on every change.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })

  useEffect(() => {
    if (changed) successRef.current?.focus()
  }, [changed])

  const showSummary = () => {
    setSummaryShown(true)
    setFocusSummary((n) => n + 1)
  }

  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setFormError(null)
    try {
      await change.mutateAsync({ currentPassword, newPassword })
      if (forced) {
        const fresh = await refreshSession(queryClient)
        await navigate(fresh ? safeNext(params.get('next'), fresh.role) : '/login', { replace: true })
        return
      }
      reset()
      setSummaryShown(false)
      setChanged(true)
    } catch (error) {
      applyServerErrors(error)
      showSummary()
    }
  }, showSummary)

  // No double submit: a second Enter or click waits for the first to settle.
  const send = () => {
    if (inFlight.current) return
    inFlight.current = true
    void submit().finally(() => {
      inFlight.current = false
    })
  }

  function applyServerErrors(error: unknown) {
    if (!(error instanceof ApiError)) {
      setFormError(t('changePassword.serverError'))
      return
    }
    if (error.status === 0) {
      setFormError(t('changePassword.networkError'))
      return
    }
    let mapped = false
    for (const { field, code } of error.fieldErrors) {
      if ((field === 'currentPassword' || field === 'newPassword') && SERVER_CODES.has(code)) {
        setError(field, { type: 'server', message: `errors.${code}` })
        mapped = true
      }
    }
    if (!mapped) setFormError(t('changePassword.serverError'))
  }

  // `errors` is read on every render: react-hook-form re-renders only for the formState parts read.
  const summaryItems: ErrorSummaryItem[] = summaryShown ? summaryOf(errors, formError, t) : []
  const hasSummary = summaryItems.length > 0
  // Focus the summary once per failed submit, as soon as it is in the DOM: after a client-side failure the errors
  // arrive in a later render than the submit's state update, so this waits for them (G3 UX-1).
  const focusedFor = useRef(0)
  useEffect(() => {
    if (hasSummary && focusSummary > focusedFor.current) {
      focusedFor.current = focusSummary
      summaryRef.current?.focus()
    }
  }, [focusSummary, hasSummary])
  const home = session ? roleHome(session.role) : '/'

  if (changed) {
    return (
      <PublicPage>
        <Stack gap={6}>
          <PageHeader title={t('changePassword.title')} />
          <div ref={successRef} tabIndex={-1}>
            <InlineAlert tone="success" title={t('changePassword.successTitle')}>
              {t('changePassword.successBody')}
            </InlineAlert>
          </div>
          <Link to={home} className={`${styles.homeLink} ${styles.flush}`}>
            {t('changePassword.home')}
          </Link>
        </Stack>
      </PublicPage>
    )
  }

  return (
    <PublicPage>
      <Stack gap={6}>
        <PageHeader
          title={t('changePassword.title')}
          description={forced ? t('changePassword.forcedDescription') : t('changePassword.voluntaryDescription')}
        />
        <ErrorSummary ref={summaryRef} title={t('changePassword.summaryTitle')} errors={summaryItems} />
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          <Stack gap={5}>
            {FIELDS.map((name) => (
              <Controller
                key={name}
                name={name}
                control={control}
                render={({ field, fieldState }) => (
                  <PasswordField
                    id={FIELD_IDS[name]}
                    label={`${t(LABELS[name])} ${t('required')}`}
                    hint={name === 'newPassword' ? t('changePassword.newHint') : undefined}
                    revealLabel={t('showPassword')}
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
                    isRequired
                    validationBehavior="aria"
                    isInvalid={fieldState.invalid}
                    errorMessage={fieldState.error?.message ? t(fieldState.error.message) : undefined}
                  />
                )}
              />
            ))}
            <div className={styles.formActions}>
              <Button type="submit" isPending={change.isPending}>
                {change.isPending ? t('changePassword.submitting') : t('changePassword.submit')}
              </Button>
              {forced ? (
                // UX-4: a way out of the forced change that is not a Cancel: end the session, back to /login.
                <Button variant="quiet" isPending={logout.isPending} onPress={() => logout.mutate()}>
                  {t('header.logout')}
                </Button>
              ) : (
                <Button
                  variant="quiet"
                  onPress={() => void (location.key === 'default' ? navigate(home) : navigate(-1))}
                >
                  {t('changePassword.cancel')}
                </Button>
              )}
            </div>
          </Stack>
        </form>
      </Stack>
    </PublicPage>
  )
}

const LABELS: Record<FieldName, string> = {
  currentPassword: 'changePassword.current',
  newPassword: 'changePassword.new',
  confirmPassword: 'changePassword.confirm',
}

function summaryOf(
  errors: FieldErrors<ChangePasswordValues>,
  formError: string | null,
  t: (key: string) => string,
): ErrorSummaryItem[] {
  const items: ErrorSummaryItem[] = FIELDS.flatMap((name) => {
    const message = errors[name]?.message
    return message ? [{ fieldId: FIELD_IDS[name], message: t(message) }] : []
  })
  return formError ? [...items, { message: formError }] : items
}
