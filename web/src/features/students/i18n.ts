import { i18n } from '../../lib/i18n'
import enStudents from '../../lib/i18n/locales/en/students.json'
import viStudents from '../../lib/i18n/locales/vi/students.json'

/** The `students` namespace: the Students pages' strings (frontend-architecture §4). */
export const studentsResources = { vi: { students: viStudents }, en: { students: enStudents } } as const

/**
 * Registers the `students` namespace when a Students page module is evaluated (each page imports this file), so the
 * strings travel with the lazily loaded tutor pages and never reach a student's first visit (NFR-PERF-03). Idempotent.
 */
export function registerStudentsNamespace() {
  for (const [lng, bundles] of Object.entries(studentsResources)) {
    if (!i18n.hasResourceBundle(lng, 'students')) i18n.addResourceBundle(lng, 'students', bundles.students)
  }
}

registerStudentsNamespace()
