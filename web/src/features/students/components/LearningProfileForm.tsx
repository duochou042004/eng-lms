import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Controller, useFieldArray, useForm, type Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../../lib/api'
import {
  Button,
  ConfirmDialog,
  ErrorSummary,
  InlineAlert,
  TagInput,
  TextArea,
  TextField,
  UnsavedChangesGuard,
  type ErrorSummaryItem,
} from '../../../ui'
import { useSaveLearningProfile, type LearningProfile } from '../api/learningProfile'
import { isTutorSession } from '../api/tutorSession'
import {
  committedTags,
  CURRENT_LEVEL_MAX,
  FIELD_LABEL_MAX,
  FIELD_VALUE_MAX,
  FIELDS_MAX,
  isUnchanged,
  LEARNING_NOTES_MAX,
  learningProfileSchema,
  sentCustomFieldRows,
  TAG_ERROR,
  TAG_LIMITS,
  TAG_MAX,
  TAGS_MAX,
  toLearningProfilePut,
  toLearningProfileValues,
  type LearningProfileValues,
} from '../model/learningProfileSchema'
import { mapLearningProfileErrors } from '../model/serverErrors'
import { useSummaryFocus } from '../model/useSummaryFocus'
import { ConflictDialog } from './ConflictDialog'
import styles from './Students.module.css'

type TagsName = 'strengths' | 'weaknesses'

/** The form's input ids (one learning-profile form per page): the error summary links to them. */
const learningProfileFieldId = {
  currentLevel: 'learning-profile-currentLevel',
  strengths: 'learning-profile-strengths',
  weaknesses: 'learning-profile-weaknesses',
  learningNotes: 'learning-profile-learningNotes',
  field: (index: number, part: 'label' | 'value') => `learning-profile-field-${index}-${part}`,
}
const ADD_FIELD_ID = 'learning-profile-add-field'

/** The `max` of a message key on a path (`TOO_LONG` of a tag is 40, the list's limit 30). */
const maxOf = (path: string, message: string) =>
  message === TAG_ERROR.tooMany
    ? TAGS_MAX
    : message === 'learningProfile.errors.fieldsTooMany'
      ? FIELDS_MAX
      : path === 'currentLevel'
        ? CURRENT_LEVEL_MAX
        : path === 'learningNotes'
          ? LEARNING_NOTES_MAX
          : path.endsWith('.label')
            ? FIELD_LABEL_MAX
            : path.endsWith('.value')
              ? FIELD_VALUE_MAX
              : TAG_MAX

export interface LearningProfileFormProps {
  studentId: string
  /** The cached profile the form opens with (its values and `version`). */
  profile: LearningProfile
  /** The form closes: after a save (`saved`), a Cancel, an unchanged Save or a conflict's Reload. */
  onClose: (saved: boolean) => void
  /** Refetch the profile (a conflict's Reload). */
  onReload: () => Promise<unknown>
  /** The student is gone (404). */
  onNotFound: () => void
}

/**
 * Edit learning profile (FR-STU-04, T-M2.17 scopes 3–5): React Hook Form + Zod. Save commits the text left in a tag
 * input, then sends the whole profile with the version the form was opened with (`null` before the first save);
 * nothing changed → no request. A field error shows the error summary and focuses it; a stale version the conflict
 * dialog; a network or server failure keeps the input. Cancel or leaving with changes asks first.
 */
export function LearningProfileForm({ studentId, profile, onClose, onReload, onNotFound }: LearningProfileFormProps) {
  const { t } = useTranslation('students')
  const queryClient = useQueryClient()
  const save = useSaveLearningProfile(studentId)
  const inFlight = useRef(false)
  // The profile the form was opened with: the base of "unchanged" and of the conflict check.
  const [opened] = useState(profile)
  const [formError, setFormError] = useState<string | null>(null)
  const [unknownErrors, setUnknownErrors] = useState<string[]>([])
  const [summaryShown, setSummaryShown] = useState(false)
  // The tag a server error on a list names (`strengths[i]`), shown with the message.
  const [serverTag, setServerTag] = useState<Partial<Record<TagsName, string>>>({})
  const [conflict, setConflict] = useState<{ notes?: string } | null>(null)
  const [askDiscard, setAskDiscard] = useState(false)
  const {
    control,
    handleSubmit,
    getValues,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<LearningProfileValues>({
    resolver: zodResolver(learningProfileSchema),
    defaultValues: toLearningProfileValues(opened),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })
  const rows = useFieldArray({ control, name: 'customFields' })

  useEffect(() => document.getElementById(learningProfileFieldId.currentLevel)?.focus(), [])

  const message = (path: string, key: string | undefined) => (key ? t(key, { max: maxOf(path, key) }) : undefined)
  const tagMessage = (name: TagsName) => {
    const error = errors[name]
    const text = message(name, error?.message)
    const tag = serverTag[name]
    return text && error?.type === 'server' && tag ? t('learningProfile.tagError', { tag, message: text }) : text
  }

  const summaryItems: ErrorSummaryItem[] = summaryShown
    ? [
        ...(['currentLevel', 'strengths', 'weaknesses', 'learningNotes'] as const).flatMap((name) => {
          const text =
            name === 'strengths' || name === 'weaknesses' ? tagMessage(name) : message(name, errors[name]?.message)
          return text ? [{ fieldId: learningProfileFieldId[name], message: text }] : []
        }),
        ...(
          errors.customFields?.map?.((row, index) =>
            (['label', 'value'] as const).flatMap((part) => {
              const text = message(`customFields.${index}.${part}`, row?.[part]?.message)
              return text ? [{ fieldId: learningProfileFieldId.field(index, part), message: text }] : []
            }),
          ) ?? []
        ).flat(),
        ...((errors.customFields?.root?.message ?? errors.customFields?.message)
          ? [{ message: t(errors.customFields.root?.message ?? errors.customFields.message!, { max: FIELDS_MAX }) }]
          : []),
        ...unknownErrors.map((m) => ({ message: t(m, { max: FIELDS_MAX }) })),
      ]
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
    setServerTag({})
    // The text left in a tag input is committed first (valid here: the schema checked it).
    for (const name of ['strengths', 'weaknesses'] as const)
      if (values[name].draft !== '')
        setValue(name, { tags: committedTags(values[name]), draft: '' }, { shouldDirty: true })
    if (isUnchanged(opened, values)) return onClose(false)
    const body = toLearningProfilePut(values, opened.version)
    try {
      await save.mutateAsync(body)
      // An answer that outlived the tutor's session closes nothing, toasts nothing (scope 7).
      if (isTutorSession(queryClient)) onClose(true)
    } catch (error) {
      if (!(error instanceof ApiError) || error.status === 0) {
        setFormError(t('profile.networkError'))
      } else if (error.status === 409 && error.code === 'STALE_VERSION') {
        setConflict({ notes: body.learningNotes !== (opened.learningNotes ?? null) ? values.learningNotes : undefined })
      } else if (error.status === 422) {
        const mapped = mapLearningProfileErrors(
          error.fieldErrors,
          { strengths: body.strengths ?? [], weaknesses: body.weaknesses ?? [] },
          sentCustomFieldRows(values.customFields),
        )
        const tags: Partial<Record<TagsName, string>> = {}
        for (const { path, message: key, tag } of mapped.fields) {
          if (tag && (path === 'strengths' || path === 'weaknesses')) tags[path] ??= tag
          setError(path, { type: 'server', message: key })
        }
        setServerTag(tags)
        setUnknownErrors(mapped.unknown)
        showSummary()
      } else if (error.status === 404) {
        onNotFound()
      } else {
        setFormError(t('learningProfile.serverError'))
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

  const tagMessages = {
    remove: (tag: string) => t('learningProfile.removeTag', { tag }),
    control: t(TAG_ERROR.control),
    tooLong: t(TAG_ERROR.tooLong, { max: TAG_MAX }),
    duplicate: t(TAG_ERROR.duplicate),
    tooMany: t(TAG_ERROR.tooMany, { max: TAGS_MAX }),
  }
  const tagsField = (name: TagsName) => (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TagInput
          id={learningProfileFieldId[name]}
          label={t(`learningProfile.${name}`)}
          hint={t('learningProfile.tagsHint')}
          value={field.value.tags}
          inputValue={field.value.draft}
          // Read the other half from the field's latest value: a commit changes both in one event.
          onChange={(tags) => field.onChange({ ...getValues(name), tags })}
          onInputChange={(draft) => field.onChange({ ...getValues(name), draft })}
          onBlur={field.onBlur}
          {...TAG_LIMITS}
          errorMessage={fieldState.error ? tagMessage(name) : undefined}
          messages={tagMessages}
        />
      )}
    />
  )

  return (
    <>
      <form
        noValidate
        className={styles.form}
        aria-label={t('learningProfile.formLabel')}
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <ErrorSummary ref={summaryRef} title={t('learningProfile.summaryTitle')} errors={summaryItems} />
        <Controller
          name="currentLevel"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              id={learningProfileFieldId.currentLevel}
              label={t('learningProfile.currentLevel')}
              hint={t('learningProfile.currentLevelHint')}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              autoComplete="off"
              validationBehavior="aria"
              isInvalid={fieldState.invalid}
              errorMessage={message('currentLevel', fieldState.error?.message)}
            />
          )}
        />
        {tagsField('strengths')}
        {tagsField('weaknesses')}
        <Controller
          name="learningNotes"
          control={control}
          render={({ field, fieldState }) => (
            <TextArea
              id={learningProfileFieldId.learningNotes}
              label={t('learningProfile.learningNotes')}
              maxLength={LEARNING_NOTES_MAX}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              validationBehavior="aria"
              isInvalid={fieldState.invalid}
              errorMessage={message('learningNotes', fieldState.error?.message)}
            />
          )}
        />
        <CustomFieldRows control={control} rows={rows} message={message} />
        {formError ? <InlineAlert tone="danger" title={formError} /> : null}
        <div className={styles.stackedActions}>
          <Button type="submit" isPending={save.isPending}>
            {save.isPending ? t('profile.saving') : t('profile.save')}
          </Button>
          <Button
            variant="quiet"
            isDisabled={save.isPending}
            onPress={() => (isDirty ? setAskDiscard(true) : onClose(false))}
          >
            {t('profile.cancel')}
          </Button>
        </div>
      </form>
      <UnsavedChangesGuard
        isDirty={isDirty}
        title={t('profile.discardTitle')}
        description={t('learningProfile.discardDescription')}
        confirmLabel={t('profile.discard')}
        cancelLabel={t('profile.keepEditing')}
      />
      <ConfirmDialog
        isOpen={askDiscard}
        title={t('profile.discardTitle')}
        description={t('learningProfile.discardDescription')}
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
        description={t('conflict.learningProfileDescription')}
        copy={
          conflict?.notes !== undefined ? { text: conflict.notes, label: t('conflict.copyLearningNotes') } : undefined
        }
        onCancel={() => setConflict(null)}
        onReload={() => {
          setConflict(null)
          void onReload().finally(() => onClose(false))
        }}
      />
    </>
  )
}

interface CustomFieldRowsProps {
  control: Control<LearningProfileValues>
  rows: ReturnType<typeof useFieldArray<LearningProfileValues, 'customFields'>>
  message: (path: string, key: string | undefined) => string | undefined
}

/**
 * Custom fields (scope 3): a fieldset of 0–30 rows, each a fieldset "Field {n}" with Label and Value stacked and Remove
 * field {n} last; Add field adds an empty row and focuses its Label (hidden at 30 with the limit text). A removal focuses
 * Add field (the contact rows' rule).
 */
function CustomFieldRows({ control, rows, message }: CustomFieldRowsProps) {
  const { t } = useTranslation('students')
  const hintId = useId()
  const count = rows.fields.length
  const before = useRef(count)
  useEffect(() => {
    const previous = before.current
    before.current = count
    if (count > previous) document.getElementById(learningProfileFieldId.field(count - 1, 'label'))?.focus()
    else if (count < previous) document.getElementById(ADD_FIELD_ID)?.focus()
  }, [count])
  const field = (index: number, part: 'label' | 'value') => (
    <Controller
      name={`customFields.${index}.${part}`}
      control={control}
      render={({ field: input, fieldState }) => (
        <TextField
          id={learningProfileFieldId.field(index, part)}
          label={
            part === 'label'
              ? `${t('learningProfile.fieldLabel')} ${t('form.required')}`
              : t('learningProfile.fieldValue')
          }
          name={input.name}
          value={input.value}
          onChange={input.onChange}
          onBlur={input.onBlur}
          autoComplete="off"
          isRequired={part === 'label'}
          validationBehavior="aria"
          isInvalid={fieldState.invalid}
          errorMessage={message(`customFields.${index}.${part}`, fieldState.error?.message)}
        />
      )}
    />
  )
  return (
    <fieldset className={styles.fieldGroup} aria-describedby={hintId}>
      <legend className={styles.legend}>{t('learningProfile.customFields')}</legend>
      <p id={hintId} className={styles.mutedText}>
        {t('learningProfile.customFieldsHint')}
      </p>
      {count > 0 ? (
        <ul className={styles.handles}>
          {rows.fields.map((row, index) => (
            <li key={row.id}>
              <fieldset className={styles.handle}>
                <legend className={styles.legend}>{t('learningProfile.fieldLegend', { number: index + 1 })}</legend>
                {field(index, 'label')}
                {field(index, 'value')}
                <div className={styles.handleRemove}>
                  <Button variant="quiet" onPress={() => rows.remove(index)}>
                    <Trash2 aria-hidden="true" className={styles.icon} />
                    {t('learningProfile.removeField', { number: index + 1 })}
                  </Button>
                </div>
              </fieldset>
            </li>
          ))}
        </ul>
      ) : null}
      {count >= FIELDS_MAX ? (
        <p className={styles.mutedText}>{t('learningProfile.fieldsFull', { max: FIELDS_MAX })}</p>
      ) : (
        <div>
          <Button
            id={ADD_FIELD_ID}
            variant="secondary"
            onPress={() => rows.append({ label: '', value: '' }, { shouldFocus: false })}
          >
            <Plus aria-hidden="true" className={styles.icon} />
            {t('learningProfile.addField')}
          </Button>
        </div>
      )}
    </fieldset>
  )
}
