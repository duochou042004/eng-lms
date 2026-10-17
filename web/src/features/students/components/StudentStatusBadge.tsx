import { useTranslation } from 'react-i18next'
import { STUDENT_STATUS, StatusBadge, type StudentStatus } from '../../../ui'

/** A student's status from the one status vocabulary (design-system §4): icon + text + tone. */
export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const { t } = useTranslation('common')
  const entry = STUDENT_STATUS[status]
  return <StatusBadge status={entry} label={t(entry.labelKey)} />
}
