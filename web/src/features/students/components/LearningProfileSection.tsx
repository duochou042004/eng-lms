import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../../lib/api'
import { Button, DelayedSkeleton, DescriptionList, InlineAlert, Skeleton, TagList, toast } from '../../../ui'
import { useLearningProfile, type LearningProfile } from '../api/learningProfile'
import type { OpenForm } from './GuardiansSection'
import { LearningProfileForm } from './LearningProfileForm'
import styles from './Students.module.css'

const TITLE_ID = 'workspace-learning-profile'
const EDIT_ID = 'learning-profile-edit'

export interface LearningProfileSectionProps {
  studentId: string
  openForm: OpenForm
  onOpenFormChange: (form: OpenForm) => void
  /** The student is gone (a 404 on the profile or on saving it). */
  onNotFound: () => void
}

/**
 * The Profile view's Learning profile section (IA §2, FR-STU-04; T-M2.17 scopes 1, 3–6): tutor-private (A-008). Read
 * only until Edit learning profile, which turns the read view into one form in place. Its loading and error states stay
 * inside the section; Edit learning profile shows only once the profile has loaded. While another form of the page is
 * open, Edit learning profile is disabled with the hint.
 */
export function LearningProfileSection({
  studentId,
  openForm,
  onOpenFormChange,
  onNotFound,
}: LearningProfileSectionProps) {
  const { t } = useTranslation('students')
  const profile = useLearningProfile(studentId)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null)
  const focusTo = (id: string) => setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }))
  useEffect(() => {
    if (focus) (document.getElementById(focus.id) ?? titleRef.current)?.focus()
  }, [focus])

  const notFound = profile.error instanceof ApiError && profile.error.status === 404
  useEffect(() => {
    if (notFound) onNotFound()
  }, [notFound, onNotFound])

  const editing = openForm === 'learning-profile'
  const data = profile.data
  return (
    <section aria-labelledby={TITLE_ID} className={styles.learningProfile}>
      <div className={styles.headingRow}>
        <h2 id={TITLE_ID} ref={titleRef} tabIndex={-1} className={styles.sectionTitle}>
          {t('learningProfile.title')}
        </h2>
        {data && !editing ? (
          <Button
            id={EDIT_ID}
            variant="secondary"
            isDisabled={openForm !== null}
            onPress={() => onOpenFormChange('learning-profile')}
          >
            {t('learningProfile.edit')}
          </Button>
        ) : null}
      </div>
      {data ? (
        editing ? (
          <LearningProfileForm
            studentId={studentId}
            profile={data}
            onReload={() => profile.refetch()}
            onNotFound={onNotFound}
            onClose={(saved) => {
              onOpenFormChange(null)
              focusTo(EDIT_ID)
              if (saved) toast.success(t('learningProfile.saved'))
            }}
          />
        ) : (
          <>
            {openForm !== null ? <p className={styles.mutedText}>{t('account.editingHint')}</p> : null}
            <LearningProfileView profile={data} />
          </>
        )
      ) : profile.isError ? (
        <InlineAlert
          tone="danger"
          title={t('learningProfile.errorTitle')}
          action={
            <Button
              variant="secondary"
              onPress={() => {
                // The alert and its button unmount on success: focus goes to the heading, never to body.
                focusTo(TITLE_ID)
                void profile.refetch()
              }}
            >
              {t('learningProfile.retry')}
            </Button>
          }
        />
      ) : (
        <output aria-busy="true" aria-label={t('learningProfile.loading')} className={styles.skeletonRows}>
          <DelayedSkeleton>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} shape="block" inlineSize="100%" blockSize="var(--size-control-lg)" />
            ))}
          </DelayedSkeleton>
        </output>
      )}
    </section>
  )
}

/** The read view: level, strengths and weaknesses (chips in order), learning notes (line breaks kept), custom fields. */
function LearningProfileView({ profile }: { profile: LearningProfile }) {
  const { t } = useTranslation('students')
  const tags = (list: readonly string[]) => (list.length > 0 ? <TagList tags={list} /> : null)
  return (
    <DescriptionList
      emptyLabel={t('workspace.notAdded')}
      items={[
        { id: 'currentLevel', term: t('learningProfile.currentLevel'), description: profile.currentLevel },
        { id: 'strengths', term: t('learningProfile.strengths'), description: tags(profile.strengths) },
        { id: 'weaknesses', term: t('learningProfile.weaknesses'), description: tags(profile.weaknesses) },
        {
          id: 'learningNotes',
          term: t('learningProfile.learningNotes'),
          description: profile.learningNotes ? <span className={styles.note}>{profile.learningNotes}</span> : null,
        },
        ...profile.customFields.map((field, index) => ({
          id: `custom-${index}`,
          term: field.label ?? '',
          description: field.value ? field.value : null,
        })),
      ]}
    />
  )
}
