import { Archive, CircleCheck, CirclePause, type LucideIcon } from 'lucide-react'

/** The tones of design-system §4: each pairs a colour with an icon and a text label (never colour alone). */
export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface StatusEntry {
  /** A `common` i18n key (`status.<domain>.<STATUS>`). */
  labelKey: string
  tone: StatusTone
  icon: LucideIcon
}

/**
 * The one status vocabulary (design-system §4): features take labels, tones and icons only from here. Student statuses
 * since T-M2.5; the work, lesson and plan rows join with their modules.
 */
export const STUDENT_STATUS = {
  ACTIVE: { labelKey: 'status.student.ACTIVE', tone: 'success', icon: CircleCheck },
  PAUSED: { labelKey: 'status.student.PAUSED', tone: 'warning', icon: CirclePause },
  ARCHIVED: { labelKey: 'status.student.ARCHIVED', tone: 'neutral', icon: Archive },
} as const satisfies Record<string, StatusEntry>

export type StudentStatus = keyof typeof STUDENT_STATUS
