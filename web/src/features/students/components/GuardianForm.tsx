import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, useForm, type Control, type FieldValues } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../../lib/api'
import {
  Button,
  ConfirmDialog,
  ErrorSummary,
  InlineAlert,
  TextArea,
  TextField,
  UnsavedChangesGuard,
  type ErrorSummaryItem,
} from '../../../ui'
import { useAddGuardian, useUpdateGuardian, type Guardian } from '../api/guardians'
import { isTutorSession } from '../api/tutorSession'
import {
  EMPTY_GUARDIAN,
  GUARDIANS_MAX,
  guardianSchema,
  toGuardianCreate,
  toGuardianPatch,
  toGuardianValues,
  type AddStudentValues,
  type GuardianValues,
} from '../model/guardianSchema'
import { mapGuardianErrors } from '../model/serverErrors'
import {
  ADD_GUARDIAN_ROW_ID,
  fieldId,
  GUARDIAN_PARTS,
  guardianFieldId,
  type GuardianPart,
} from '../model/studentFields'
import { useSummaryFocus } from '../model/useSummaryFocus'
import { ConflictDialog } from './ConflictDialog'
import styles from './Students.module.css'

const MAX = Object.fromEntries(GUARDIAN_PARTS) as Record<GuardianPart, number | undefined>

export interface GuardianFieldsProps {
  /** The form's control (the guardian form, or the add form with `prefix` `guardians.{i}.`). */
  control: Control<FieldValues>
  /** The field names' prefix: `''` in the guardian form, `guardians.{i}.` in an add form row. */
  prefix: string
  /** The input ids (the error summary links to them). */
  id: (part: GuardianPart) => string
}

/**
 * A guardian's five fields (T-M2.15 scope 2), stacked one per row: Name (required), Relationship (with a hint), Phone,
 * Email and Notes (with a counter). The guardian form and each guardian row of Add student (scope 7) use them.
 */
export function GuardianFields({ control, prefix, id }: GuardianFieldsProps) {
  const { t } = useTranslation('students')
  const message = (text: string | undefined, part: GuardianPart) => (text ? t(text, { max: MAX[part] }) : undefined)
  const field = (part: Exclude<GuardianPart, 'notes'>) => (
    <Controller
      key={part}
      name={`${prefix}${part}`}
      control={control}
      render={({ field: input, fieldState }) => (
        <TextField
          id={id(part)}
          label={part === 'name' ? `${t('guardianForm.name')} ${t('form.required')}` : t(`guardianForm.${part}`)}
          hint={part === 'relationship' ? t('guardianForm.relationshipHint') : undefined}
          type={part === 'phone' ? 'tel' : part === 'email' ? 'email' : 'text'}
          inputMode={part === 'phone' ? 'tel' : part === 'email' ? 'email' : undefined}
          name={input.name}
          value={input.value as string}
          onChange={input.onChange}
          onBlur={input.onBlur}
          autoComplete="off"
          isRequired={part === 'name'}
          validationBehavior="aria"
          isInvalid={fieldState.invalid}
          errorMessage={message(fieldState.error?.message, part)}
        />
      )}
    />
  )
  return (
    <>
      {field('name')}
      {field('relationship')}
      {field('phone')}
      {field('email')}
      <Controller
        name={`${prefix}notes`}
        control={control}
        render={({ field: input, fieldState }) => (
          <TextArea
            id={id('notes')}
            label={t('guardianForm.notes')}
            maxLength={MAX.notes}
            name={input.name}
            value={input.value as string}
            onChange={input.onChange}
            onBlur={input.onBlur}
            validationBehavior="aria"
            isInvalid={fieldState.invalid}
            errorMessage={message(fieldState.error?.message, 'notes')}
          />
        )}
      />
    </>
  )
}

/**
 * Add student's guardian rows (T-M2.15 scope 7): 0–10 rows, each a fieldset "Guardian {n}" with the five fields and
 * Remove guardian {n} last. Add guardian focuses the new row's Name; a removal focuses the previous row's Name (the new
 * first row's for the first, Add guardian when none is left). Add is hidden at 10.
 */
export function GuardianRows({ control }: { control: Control<AddStudentValues> }) {
  const { t } = useTranslation('students')
  const rows = useFieldArray({ control, name: 'guardians' })
  const count = rows.fields.length
  // The row (by position: React Aria updates a moved row's input ids a render later) or Add guardian to focus.
  const focusNext = useRef<number | 'add' | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    const next = focusNext.current
    focusNext.current = null
    if (next === 'add') document.getElementById(ADD_GUARDIAN_ROW_ID)?.focus()
    else if (next !== null) listRef.current?.children[next]?.querySelector('input')?.focus()
  }, [count])
  return (
    <div className={styles.form}>
      {count > 0 ? (
        <ul ref={listRef} className={styles.handles}>
          {rows.fields.map((row, index) => (
            <li key={row.id}>
              <fieldset className={styles.handle}>
                <legend className={styles.legend}>{t('form.guardianLegend', { number: index + 1 })}</legend>
                <GuardianFields
                  control={control as unknown as Control<FieldValues>}
                  prefix={`guardians.${index}.`}
                  id={(part) => fieldId.guardian(index, part)}
                />
                <div className={styles.handleRemove}>
                  <Button
                    variant="quiet"
                    onPress={() => {
                      focusNext.current = count === 1 ? 'add' : Math.max(index - 1, 0)
                      rows.remove(index)
                    }}
                  >
                    <Trash2 aria-hidden="true" className={styles.icon} />
                    {t('form.removeGuardian', { number: index + 1 })}
                  </Button>
                </div>
              </fieldset>
            </li>
          ))}
        </ul>
      ) : null}
      {count >= GUARDIANS_MAX ? (
        <p className={styles.mutedText}>{t('form.guardiansFull', { max: GUARDIANS_MAX })}</p>
      ) : (
        <div>
          <Button
            id={ADD_GUARDIAN_ROW_ID}
            variant="secondary"
            onPress={() => {
              focusNext.current = count
              rows.append(EMPTY_GUARDIAN, { shouldFocus: false })
            }}
          >
            <Plus aria-hidden="true" className={styles.icon} />
            {t('form.addGuardian')}
          </Button>
        </div>
      )}
    </div>
  )
}

/** How the form closed: saved (with the answer) or not (Cancel, nothing changed, a conflict's Reload). */
export type GuardianFormResult = { guardian: Guardian; added: boolean } | null

export interface GuardianFormProps {
  studentId: string
  /** The guardian to edit (with its saved values and `version`); none to add one. */
  guardian?: Guardian
  onClose: (result: GuardianFormResult) => void
  /** Refetch the guardians (a conflict's Reload, another tab's 10th). */
  onReload: () => Promise<unknown>
  /** A PATCH answered 404: another tab removed the guardian. */
  onRemovedElsewhere: () => void
  /** A POST answered 404: the student is gone. */
  onNotFound: () => void
}

/**
 * Add or edit a guardian in place (T-M2.15 scopes 2, 3, 5, 6): React Hook Form + Zod; add sends the trimmed values,
 * edit only the changed ones with the guardian's `version` (nothing changed → no request). A field error shows the
 * error summary and focuses it; another tab's 10th guardian an alert; a stale version the conflict dialog; a network or
 * server failure keeps the input. Cancel or leaving with changes asks first.
 */
export function GuardianForm({
  studentId,
  guardian,
  onClose,
  onReload,
  onRemovedElsewhere,
  onNotFound,
}: GuardianFormProps) {
  const { t } = useTranslation('students')
  const queryClient = useQueryClient()
  const add = useAddGuardian(studentId)
  const update = useUpdateGuardian(studentId)
  const pending = add.isPending || update.isPending
  const inFlight = useRef(false)
  // The values and the version the form was opened with: the base of the change set and of the conflict check.
  const [initial] = useState(() => (guardian ? toGuardianValues(guardian) : EMPTY_GUARDIAN))
  const [version] = useState(guardian?.version)
  const [formError, setFormError] = useState<string | null>(null)
  const [unknownErrors, setUnknownErrors] = useState<string[]>([])
  const [summaryShown, setSummaryShown] = useState(false)
  const [tooMany, setTooMany] = useState(0)
  const [conflict, setConflict] = useState<{ notes?: string } | null>(null)
  const [askDiscard, setAskDiscard] = useState(false)
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<GuardianValues>({
    resolver: zodResolver(guardianSchema),
    defaultValues: initial,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })

  useEffect(() => document.getElementById(guardianFieldId('name'))?.focus(), [])
  const tooManyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (tooMany > 0) tooManyRef.current?.focus()
  }, [tooMany])

  const summaryItems: ErrorSummaryItem[] = summaryShown
    ? [
        ...GUARDIAN_PARTS.flatMap(([part, max]) => {
          const message = errors[part]?.message
          return message ? [{ fieldId: guardianFieldId(part), message: t(message, { max }) }] : []
        }),
        ...unknownErrors.map((m) => ({ message: t(m) })),
      ]
    : []
  const summaryRef = useRef<HTMLDivElement>(null)
  const requestSummaryFocus = useSummaryFocus(summaryRef, summaryItems.length > 0)
  const showSummary = () => {
    setTooMany(0)
    setSummaryShown(true)
    requestSummaryFocus()
  }

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    setUnknownErrors([])
    setTooMany(0)
    const patch = guardian ? toGuardianPatch(initial, values, version!) : null
    if (guardian && !patch) return onClose(null)
    try {
      const saved = patch
        ? await update.mutateAsync({ gid: guardian!.id, body: patch })
        : await add.mutateAsync(toGuardianCreate(values))
      // An answer that outlived the tutor's session closes nothing, toasts nothing (scope 8).
      if (isTutorSession(queryClient)) onClose({ guardian: saved, added: !guardian })
    } catch (error) {
      if (!(error instanceof ApiError) || error.status === 0) {
        setFormError(t('guardianForm.networkError'))
      } else if (error.status === 409 && error.code === 'STALE_VERSION') {
        setConflict({ notes: patch && 'notes' in patch ? values.notes : undefined })
      } else if (error.status === 422) {
        const mapped = mapGuardianErrors(error.fieldErrors)
        if (mapped.tooMany) {
          void onReload()
          setSummaryShown(false)
          setTooMany((n) => n + 1)
          return
        }
        for (const { path, message } of mapped.fields) setError(path, { type: 'server', message })
        setUnknownErrors(mapped.unknown)
        showSummary()
      } else if (error.status === 404) {
        if (guardian) onRemovedElsewhere()
        else onNotFound()
      } else {
        setFormError(t('guardianForm.serverError'))
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
        aria-label={guardian ? t('guardianForm.editLabel', { name: guardian.name }) : t('guardianForm.newLabel')}
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <ErrorSummary ref={summaryRef} title={t('guardianForm.summaryTitle')} errors={summaryItems} />
        {tooMany > 0 ? (
          <div ref={tooManyRef} tabIndex={-1} className={styles.focusTarget}>
            <InlineAlert tone="danger" title={t('guardianForm.tooMany', { max: GUARDIANS_MAX })} />
          </div>
        ) : null}
        <GuardianFields control={control as unknown as Control<FieldValues>} prefix="" id={guardianFieldId} />
        {formError ? <InlineAlert tone="danger" title={formError} /> : null}
        <div className={styles.stackedActions}>
          <Button type="submit" isPending={pending}>
            {pending ? t('guardianForm.saving') : t('guardianForm.save')}
          </Button>
          <Button variant="quiet" isDisabled={pending} onPress={() => (isDirty ? setAskDiscard(true) : onClose(null))}>
            {t('guardianForm.cancel')}
          </Button>
        </div>
      </form>
      <UnsavedChangesGuard
        isDirty={isDirty}
        title={t('guardianForm.discardTitle')}
        description={t('guardianForm.discardDescription')}
        confirmLabel={t('guardianForm.discard')}
        cancelLabel={t('guardianForm.keepEditing')}
      />
      <ConfirmDialog
        isOpen={askDiscard}
        title={t('guardianForm.discardTitle')}
        description={t('guardianForm.discardDescription')}
        confirmLabel={t('guardianForm.discard')}
        cancelLabel={t('guardianForm.keepEditing')}
        onConfirm={() => {
          setAskDiscard(false)
          onClose(null)
        }}
        onCancel={() => setAskDiscard(false)}
      />
      <ConflictDialog
        isOpen={conflict !== null}
        description={t('conflict.guardianDescription')}
        copy={conflict?.notes !== undefined ? { text: conflict.notes, label: t('conflict.copyNotes') } : undefined}
        onCancel={() => setConflict(null)}
        onReload={() => {
          setConflict(null)
          void onReload().finally(() => onClose(null))
        }}
      />
    </>
  )
}
