import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  useUpdateWorkspaceSettings,
  useWorkspaceSettings,
  type WorkspaceSettings,
} from '../../../features/settings/api/workspace'
import { useMeta } from '../../../features/settings/api/useMeta'
import { ApiError } from '../../../lib/api'
import { LOCALES } from '../../../lib/i18n'
import { usePageTitle } from '../../../lib/i18n/pageTitle'
import {
  Button,
  ConfirmDialog,
  DelayedSkeleton,
  ErrorSummary,
  InlineAlert,
  SegmentedControl,
  Skeleton,
  TextField,
  toast,
  UnsavedChangesGuard,
  type ErrorSummaryItem,
} from '../../../ui'
import { ComboBox } from '../../../ui/ComboBox'
import { timeZoneOptions } from './accountForm'
import './i18n'
import styles from './Settings.module.css'
import {
  mapWorkspaceErrors,
  toWorkspaceRequest,
  WORKSPACE_FIELDS,
  workspaceSchema,
  workspaceValues,
  type WorkspaceValues,
} from './workspaceForm'

const SAVE_ID = 'workspace-save'
const FIELD_IDS: Record<keyof WorkspaceValues, string> = {
  displayName: 'workspace-display-name',
  defaultLocale: 'workspace-default-locale',
  defaultTimeZone: 'workspace-default-time-zone',
}

/**
 * `/tutor/settings/workspace` (FR-SET-01, T-M2.35 scope 7): the workspace name (the brand on the sign-in page and in
 * the shells) and the defaults for new students. Save sends `version` and only the changed properties; a 409 opens the
 * conflict dialog (Reload, or keep editing).
 */
export function WorkspaceSettingsPage() {
  const { t } = useTranslation('settings')
  usePageTitle(t('workspace.pageTitle'))
  const headingId = useId()
  const read = useWorkspaceSettings()
  return (
    <section aria-labelledby={headingId} className={styles.column}>
      <h2 id={headingId} className={styles.heading}>
        {t('workspace.heading')}
      </h2>
      {read.data ? (
        <WorkspaceForm
          settings={read.data}
          loadFailed={read.isError}
          onRetryLoad={() => void read.refetch()}
          reload={async () => (await read.refetch()).data}
        />
      ) : read.isError ? (
        <InlineAlert
          tone="danger"
          title={t('workspace.loadError')}
          action={
            <Button variant="secondary" isPending={read.isFetching} onPress={() => void read.refetch()}>
              {t('workspace.retry')}
            </Button>
          }
        />
      ) : (
        <output aria-busy="true" aria-label={t('workspace.loading')} className={styles.form}>
          <DelayedSkeleton>
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} shape="block" inlineSize="100%" blockSize="var(--size-control-lg)" />
            ))}
          </DelayedSkeleton>
        </output>
      )}
    </section>
  )
}

function WorkspaceForm({
  settings,
  loadFailed,
  onRetryLoad,
  reload,
}: {
  settings: WorkspaceSettings
  loadFailed: boolean
  onRetryLoad: () => void
  reload: () => Promise<WorkspaceSettings | undefined>
}) {
  const { t } = useTranslation('settings')
  const { t: tc } = useTranslation()
  const locales: readonly string[] = useMeta().data?.locales ?? LOCALES
  const save = useUpdateWorkspaceSettings()
  const inFlight = useRef(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const lastEdited = useRef<keyof WorkspaceValues>('displayName')
  const [summaryShown, setSummaryShown] = useState(0)
  const [unknownError, setUnknownError] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  // Where focus goes once the conflict dialog has closed (UI rules): Save after Reload, the last field after Keep editing.
  const focusAfter = useRef<string | null>(null)
  const saved = useMemo(() => workspaceValues(settings), [settings])
  const zones = useMemo(() => timeZoneOptions(saved.defaultTimeZone), [saved.defaultTimeZone])
  const localeOptions = useMemo(
    () =>
      (locales.includes(saved.defaultLocale) ? locales : [saved.defaultLocale, ...locales]).map((id) => ({
        id,
        label: tc(`language.${id}`, { defaultValue: id }),
        lang: id,
      })),
    [locales, saved.defaultLocale, tc],
  )
  const { control, handleSubmit, setError, reset, getValues, setValue, formState } = useForm<WorkspaceValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: saved,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  useEffect(() => {
    reset(saved, { keepDirtyValues: true })
  }, [saved, reset])
  const values = useWatch({ control }) as WorkspaceValues
  const changed = toWorkspaceRequest(saved, values, settings.version) !== null

  useEffect(() => {
    if (conflict || !focusAfter.current) return
    // The language group's wrapper is not focusable: its selected segment is.
    const target = document.getElementById(focusAfter.current)
    focusAfter.current = null
    ;(target?.matches('input, button') ? target : target?.querySelector<HTMLElement>('[aria-checked="true"]'))?.focus()
  }, [conflict])

  const errors = formState.errors
  const summaryItems: ErrorSummaryItem[] =
    summaryShown > 0
      ? [
          ...(['displayName', 'defaultTimeZone'] as const).flatMap((field) =>
            errors[field]?.message ? [{ message: t(errors[field].message), fieldId: FIELD_IDS[field] }] : [],
          ),
          ...(unknownError ? [{ message: t('workspace.errors.server') }] : []),
        ]
      : []
  // Focus the summary once per failed submit, on the first render that shows it (T-M2.6 QA-1: a client failure's
  // count renders before its errors).
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
    const body = toWorkspaceRequest(saved, form, settings.version)
    if (!body) return
    setFormError(null)
    setUnknownError(false)
    try {
      const answer = await save.mutateAsync(body)
      // What was typed while saving stays, and dirty (T-M2.6 QA-2); the fields sent show the answer.
      const current = getValues()
      reset(workspaceValues(answer))
      for (const field of WORKSPACE_FIELDS)
        if (current[field] !== form[field]) setValue(field, current[field], { shouldDirty: true })
      setSummaryShown(0)
      toast.success(t('workspace.saved'))
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        const mapped = mapWorkspaceErrors(error.fieldErrors)
        for (const { path, message } of mapped.fields) setError(path, { type: 'server', message })
        setUnknownError(mapped.unknown || mapped.fields.length === 0)
        failed()
      } else if (error instanceof ApiError && error.status === 409 && error.code === 'STALE_VERSION') {
        setConflict(true)
      } else if (error instanceof ApiError && error.status !== 0) {
        setFormError(t('workspace.serverError'))
      } else {
        setFormError(t('workspace.networkError'))
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
  const edited = (field: keyof WorkspaceValues, onChange: (value: string) => void) => (value: string) => {
    lastEdited.current = field
    onChange(value)
  }

  return (
    <>
      {loadFailed ? (
        <InlineAlert
          tone="warning"
          title={t('workspace.loadError')}
          action={
            <Button variant="secondary" onPress={onRetryLoad}>
              {t('workspace.retry')}
            </Button>
          }
        />
      ) : null}
      <form
        noValidate
        className={styles.form}
        aria-label={t('workspace.formLabel')}
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <ErrorSummary ref={summaryRef} title={t('workspace.summaryTitle')} errors={summaryItems} />
        <Controller
          control={control}
          name="displayName"
          render={({ field, fieldState }) => (
            <TextField
              id={FIELD_IDS.displayName}
              label={`${t('workspace.displayName')} ${t('workspace.required')}`}
              hint={t('workspace.displayNameHint')}
              autoComplete="off"
              value={field.value}
              onChange={edited('displayName', field.onChange)}
              onBlur={field.onBlur}
              isInvalid={fieldState.invalid}
              errorMessage={fieldState.error?.message ? t(fieldState.error.message) : undefined}
            />
          )}
        />
        <div className={styles.defaults}>
          <Controller
            control={control}
            name="defaultLocale"
            render={({ field }) => (
              <div className={styles.language} id={FIELD_IDS.defaultLocale}>
                <SegmentedControl
                  label={t('workspace.defaultLocale')}
                  labelVisible
                  options={localeOptions}
                  selected={field.value}
                  onChange={edited('defaultLocale', field.onChange)}
                />
              </div>
            )}
          />
          <Controller
            control={control}
            name="defaultTimeZone"
            render={({ field, fieldState }) => (
              <ComboBox
                id={FIELD_IDS.defaultTimeZone}
                label={t('workspace.defaultTimeZone')}
                description={t('account.timeZoneHint')}
                options={zones}
                value={field.value}
                onChange={edited('defaultTimeZone', field.onChange)}
                emptyMessage={t('account.timeZoneEmpty')}
                buttonLabel={t('account.timeZoneShow')}
                listLabel={t('account.timeZoneList')}
                isInvalid={fieldState.invalid}
                errorMessage={fieldState.error?.message ? t(fieldState.error.message) : undefined}
              />
            )}
          />
          <p className={styles.hint}>{t('workspace.defaultsHint')}</p>
        </div>
        {formError ? (
          <InlineAlert
            tone="danger"
            title={formError}
            action={
              <Button variant="secondary" isDisabled={save.isPending} onPress={send}>
                {t('workspace.retry')}
              </Button>
            }
          />
        ) : null}
        <div>
          <Button id={SAVE_ID} type="submit" isPending={save.isPending} aria-disabled={changed ? undefined : true}>
            {save.isPending ? t('workspace.saving') : t('workspace.save')}
          </Button>
        </div>
      </form>
      <ConfirmDialog
        isOpen={conflict}
        title={t('workspace.conflict.title')}
        description={t('workspace.conflict.description')}
        confirmLabel={t('workspace.conflict.reload')}
        confirmVariant="primary"
        cancelLabel={t('workspace.conflict.keepEditing')}
        onConfirm={() => {
          setConflict(false)
          focusAfter.current = SAVE_ID
          void reload().then((fresh) => {
            if (fresh) reset(workspaceValues(fresh))
            setSummaryShown(0)
            setFormError(null)
          })
        }}
        onCancel={() => {
          setConflict(false)
          focusAfter.current = FIELD_IDS[lastEdited.current]
        }}
      />
      <UnsavedChangesGuard
        isDirty={changed}
        title={t('workspace.discardTitle')}
        description={t('workspace.discardDescription')}
        confirmLabel={t('workspace.discard')}
        cancelLabel={t('workspace.keepEditing')}
      />
    </>
  )
}
