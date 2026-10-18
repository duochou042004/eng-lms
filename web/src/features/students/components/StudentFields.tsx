import { CircleAlert, CircleCheck, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Controller, useFieldArray, type Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button, TextArea, TextField } from '../../../ui'
import {
  EMAIL_MAX,
  FULL_NAME_MAX,
  HANDLE_LABEL_MAX,
  HANDLE_VALUE_MAX,
  HANDLES_MAX,
  NOTE_MAX,
} from '../model/createSchema'
import type { EditStudentValues } from '../model/editSchema'
import { ADD_HANDLE_ID, fieldId } from '../model/studentFields'
import type { Availability } from './useUsernameCheck'
import styles from './Students.module.css'

/** The student fields both forms share (T-M2.14 design notes): Add student (F2) and Edit profile. */
type Fields = EditStudentValues
// Both forms' values hold every shared field (the add form also a password): the shared parts see only those.
const shared = <T extends Fields>(control: Control<T>) => control as unknown as Control<Fields>

function useMessage() {
  const { t } = useTranslation('students')
  return {
    t,
    message: (text: string | undefined, max?: number) => (text ? t(text, { max }) : undefined),
    required: (label: string) => `${label} ${t('form.required')}`,
  }
}

export function FullNameField<T extends Fields>({ control }: { control: Control<T> }) {
  const { t, message, required } = useMessage()
  return (
    <Controller
      name="fullName"
      control={shared(control)}
      render={({ field, fieldState }) => (
        <TextField
          id={fieldId.fullName}
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
  )
}

export function UsernameField<T extends Fields>({
  control,
  hint,
  availability,
  onEdited,
}: {
  control: Control<T>
  hint: string
  availability: Availability
  /** Called on every keystroke (the add form stops suggesting). */
  onEdited?: () => void
}) {
  const { t, message, required } = useMessage()
  return (
    <div>
      <Controller
        name="username"
        control={shared(control)}
        render={({ field, fieldState }) => (
          <TextField
            id={fieldId.username}
            label={required(t('form.username'))}
            hint={hint}
            name={field.name}
            value={field.value}
            onChange={(value) => {
              onEdited?.()
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
      <output className={styles.availability} data-tone={availabilityTone(availability)}>
        {availability === 'available' ? (
          <CircleCheck aria-hidden="true" className={styles.availabilityIcon} />
        ) : availability === 'taken' || availability === 'invalid' ? (
          <CircleAlert aria-hidden="true" className={styles.availabilityIcon} />
        ) : null}
        {availability ? t(`form.${availability}`) : null}
      </output>
    </div>
  )
}

function availabilityTone(state: Availability) {
  if (state === 'available') return 'success'
  if (state === 'taken' || state === 'invalid') return 'danger'
  return undefined
}

/** Email, phone and the contact handles (≤ 30 label + value rows, add and remove). */
export function ContactFields<T extends Fields>({
  control,
  handlesHeadingLevel = 3,
}: {
  control: Control<T>
  /** The "Other contacts" title: 3 in the add form's Contact section, 4 under the edit form's Contacts `h3`. */
  handlesHeadingLevel?: 3 | 4
}) {
  const { t, message, required } = useMessage()
  const handles = useFieldArray({ control: shared(control), name: 'contactHandles' })
  // A new contact row: focus its first field. A removed one: focus "Add a contact".
  const handleCount = useRef(handles.fields.length)
  useEffect(() => {
    const before = handleCount.current
    handleCount.current = handles.fields.length
    if (handles.fields.length > before)
      document.getElementById(fieldId.handle(handles.fields.length - 1, 'label'))?.focus()
    else if (handles.fields.length < before) document.getElementById(ADD_HANDLE_ID)?.focus()
  }, [handles.fields.length])
  return (
    <div className={styles.form}>
      <Controller
        name="email"
        control={shared(control)}
        render={({ field, fieldState }) => (
          <TextField
            id={fieldId.email}
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
        control={shared(control)}
        render={({ field, fieldState }) => (
          <TextField
            id={fieldId.phone}
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
          {handlesHeadingLevel === 4 ? (
            <h4 className={styles.subSubTitle}>{t('form.handlesTitle')}</h4>
          ) : (
            <h3 className={styles.legend}>{t('form.handlesTitle')}</h3>
          )}
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
                    control={shared(control)}
                    render={({ field, fieldState }) => (
                      <TextField
                        id={fieldId.handle(index, 'label')}
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
                    control={shared(control)}
                    render={({ field, fieldState }) => (
                      <TextField
                        id={fieldId.handle(index, 'value')}
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
  )
}

export function NoteField<T extends Fields>({ control }: { control: Control<T> }) {
  const { t, message } = useMessage()
  return (
    <Controller
      name="note"
      control={shared(control)}
      render={({ field, fieldState }) => (
        <TextArea
          id={fieldId.note}
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
  )
}
