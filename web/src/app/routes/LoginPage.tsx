import { zodResolver } from '@hookform/resolvers/zod'
import { useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { useLogin } from '../../features/auth/api/session'
import { changePasswordPath, safeNext } from '../../features/auth/model/redirect'
import { loginSchema, type LoginValues } from '../../features/auth/model/schemas'
import { ApiError } from '../../lib/api'
import { Button, Checkbox, InlineAlert, PageHeader, PasswordField, Stack, TextField } from '../../ui'
import { PublicPage } from '../components/PublicPage'
import { usePageTitle } from '../routeAnnouncement'
import styles from './Page.module.css'

const FIELD_IDS: Record<keyof LoginValues, string> = {
  username: 'login-username',
  password: 'login-password',
  rememberMe: 'login-remember',
}

/** "5 minutes" / "5 phút": the 429 wait from `Retry-After`, through Intl (seconds under a minute). */
function formatWait(seconds: number, locale: string) {
  const inMinutes = seconds >= 60
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: inMinutes ? 'minute' : 'second',
    unitDisplay: 'long',
  }).format(inMinutes ? Math.ceil(seconds / 60) : seconds)
}

/**
 * `/login` (FR-AUTH-03, T-M2.4 scope 5): one screen, two fields and submit (ux-flows: login). The route loader has
 * already sent a signed-in visitor home, or logged out a session that must change its password (DEC-092). A failure
 * keeps the page and the cached (anonymous) session: one generic message for every 401 (DEC-089), the wait for a 429, a
 * retry for a network failure. After success: the forced change, a safe `?next=` of the role (T18) or the role home,
 * always through the router.
 */
export function LoginPage() {
  const { t, i18n } = useTranslation('auth')
  usePageTitle(t('login.title'))
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const login = useLogin()
  const inFlight = useRef(false)
  const { control, handleSubmit } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', rememberMe: false },
    mode: 'onTouched',
  })

  const submit = handleSubmit(
    async (values) => {
      try {
        const session = await login.mutateAsync(values)
        const next = params.get('next')
        await navigate(session.mustChangePassword ? changePasswordPath(next) : safeNext(next, session.role), {
          replace: true,
        })
      } catch {
        // Shown from login.error below.
      }
    },
    (errors) => {
      const first = (Object.keys(FIELD_IDS) as Array<keyof LoginValues>).find((name) => errors[name])
      if (first) document.getElementById(FIELD_IDS[first])?.focus()
    },
  )

  // No double submit: Enter, clicks and Retry all pass here; a second one waits for the first to settle.
  const send = () => {
    if (inFlight.current) return
    inFlight.current = true
    void submit().finally(() => {
      inFlight.current = false
    })
  }

  const error = login.isError ? login.error : null
  return (
    <PublicPage>
      <Stack gap={6}>
        <PageHeader title={t('login.title')} description={t('login.description')} />
        {error ? <LoginError error={error} locale={i18n.language} onRetry={send} /> : null}
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
        >
          <Stack gap={5}>
            <Controller
              name="username"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  id={FIELD_IDS.username}
                  label={`${t('login.username')} ${t('required')}`}
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  autoComplete="username"
                  isRequired
                  validationBehavior="aria"
                  isInvalid={fieldState.invalid}
                  errorMessage={fieldState.error?.message ? t(fieldState.error.message) : undefined}
                />
              )}
            />
            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => (
                <PasswordField
                  id={FIELD_IDS.password}
                  label={`${t('login.password')} ${t('required')}`}
                  revealLabel={t('showPassword')}
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  autoComplete="current-password"
                  isRequired
                  validationBehavior="aria"
                  isInvalid={fieldState.invalid}
                  errorMessage={fieldState.error?.message ? t(fieldState.error.message) : undefined}
                />
              )}
            />
            <Controller
              name="rememberMe"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id={FIELD_IDS.rememberMe}
                  label={t('login.rememberMe')}
                  hint={t('login.rememberHint')}
                  name={field.name}
                  isSelected={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            <div className={styles.formActions}>
              <Button type="submit" isPending={login.isPending}>
                {login.isPending ? t('login.submitting') : t('login.submit')}
              </Button>
            </div>
          </Stack>
        </form>
        <details className={styles.disclosure}>
          <summary className={styles.disclosureSummary}>{t('login.forgotTitle')}</summary>
          <div className={styles.disclosureBody}>
            <p>{t('login.forgotStudent')}</p>
            <p>{t('login.forgotTutor')}</p>
          </div>
        </details>
      </Stack>
    </PublicPage>
  )
}

function LoginError({ error, locale, onRetry }: { error: unknown; locale: string; onRetry: () => void }) {
  const { t } = useTranslation('auth')
  const status = error instanceof ApiError ? error.status : -1
  if (status === 401) {
    return (
      <InlineAlert tone="danger" title={t('login.failed')}>
        {t('login.failedHint')}
      </InlineAlert>
    )
  }
  if (status === 429) {
    const seconds = error instanceof ApiError ? error.retryAfterSeconds : null
    return (
      <InlineAlert tone="danger" title={t('login.rateLimited')}>
        {seconds ? t('login.rateLimitedHint', { wait: formatWait(seconds, locale) }) : t('login.rateLimitedHintNoWait')}
      </InlineAlert>
    )
  }
  const network = status === 0
  return (
    <InlineAlert
      tone="danger"
      title={network ? t('login.networkError') : t('login.serverError')}
      action={
        <Button variant="secondary" onPress={onRetry}>
          {t('login.retry')}
        </Button>
      }
    >
      {network ? t('login.networkErrorHint') : t('login.serverErrorHint')}
    </InlineAlert>
  )
}
