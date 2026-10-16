import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '../../../lib/api'
import { usePageTitle } from '../../../lib/i18n/pageTitle'
import { hasClientNavigated } from '../../../lib/navigation'
import { formatDate } from '../../../lib/time'
import { Button, DelayedSkeleton, DescriptionList, InlineAlert, PageHeader, Skeleton, Stack } from '../../../ui'
import { useStudent, type Student } from '../api/students'
import { ContactValue } from '../components/ContactValue'
import { StudentNotFound } from '../components/StudentNotFound'
import { StudentStatusBadge } from '../components/StudentStatusBadge'
import styles from '../components/Students.module.css'
import '../i18n'
import { contactHref } from '../model/contactHref'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * `/tutor/students/:studentId` (FR-STU-06 read-only, FR-STU-07; T-M2.5 scopes 6–7): the workspace header (name, status,
 * username, contact quick links) and the Profile view. No tab bar while Profile is the only content (DEC-120 (3), (8)).
 * A 404 or a `:studentId` that is not a UUID (no request) shows the feature's not-found view inside the shell.
 */
export function StudentWorkspacePage() {
  const { t } = useTranslation('students')
  const { studentId = '' } = useParams()
  const valid = UUID.test(studentId)
  const student = useStudent(studentId, valid)
  const notFound = !valid || (student.error instanceof ApiError && student.error.status === 404)
  usePageTitle(notFound ? t('workspace.notFoundTitle') : (student.data?.fullName ?? t('workspace.title')))
  useFocusWhenLoaded(student.data !== undefined || notFound || student.isError)

  if (notFound) return <StudentNotFound />
  return (
    <Stack gap={5}>
      <BackLink />
      {student.data ? (
        <Workspace student={student.data} />
      ) : student.isError ? (
        <>
          <PageHeader title={t('workspace.title')} />
          <InlineAlert
            tone="danger"
            title={t('workspace.errorTitle')}
            action={
              <Button variant="secondary" onPress={() => void student.refetch()}>
                {t('workspace.retry')}
              </Button>
            }
          >
            {t('workspace.errorDescription')}
          </InlineAlert>
        </>
      ) : (
        <WorkspaceSkeleton />
      )}
    </Stack>
  )
}

/** "Back to students", with the list's search params it was opened from (a list row passes them as link state). */
function BackLink() {
  const { t } = useTranslation('students')
  const state: unknown = useLocation().state
  const raw = (state as { listSearch?: unknown } | null)?.listSearch
  // Re-serialised, so whatever the history entry holds can only become search params of the list.
  const search = typeof raw === 'string' ? new URLSearchParams(raw).toString() : ''
  return (
    <Link to={`/tutor/students${search ? `?${search}` : ''}`} className={styles.backLink}>
      <ArrowLeft aria-hidden="true" className={styles.icon} />
      {t('workspace.back')}
    </Link>
  )
}

function Workspace({ student }: { student: Student }) {
  const { t, i18n } = useTranslation('students')
  const contacts = [
    ...(student.phone ? [{ kind: 'phone' as const, value: student.phone, label: t('workspace.phone') }] : []),
    ...(student.email ? [{ kind: 'email' as const, value: student.email, label: t('workspace.email') }] : []),
    ...student.contactHandles.flatMap((h) =>
      h.value ? [{ kind: 'handle' as const, value: h.value, label: h.label ?? '' }] : [],
    ),
  ]
  const quickLinks = contacts.filter((c) => contactHref(c.kind, c.value) !== null)
  return (
    <>
      <PageHeader
        title={student.fullName}
        meta={
          <>
            <StudentStatusBadge status={student.status} />
            <span className={styles.value}>@{student.username}</span>
          </>
        }
      />
      {quickLinks.length > 0 ? (
        <nav aria-label={t('workspace.quickLinks')}>
          <ul className={styles.quickLinks}>
            {quickLinks.map((c, index) => (
              <li key={`${c.kind}-${index}`}>
                <ContactValue {...c} />
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <section aria-labelledby="workspace-personal">
        <h2 id="workspace-personal" className={styles.sectionTitle}>
          {t('workspace.personal')}
        </h2>
        <DescriptionList
          emptyLabel={t('workspace.notAdded')}
          items={[
            { id: 'fullName', term: t('workspace.fullName'), description: student.fullName },
            { id: 'username', term: t('workspace.username'), description: student.username },
            { id: 'status', term: t('workspace.status'), description: <StudentStatusBadge status={student.status} /> },
            { id: 'addedOn', term: t('workspace.addedOn'), description: formatDate(student.createdAt, i18n.language) },
          ]}
        />
      </section>
      <section aria-labelledby="workspace-contacts">
        <h2 id="workspace-contacts" className={styles.sectionTitle}>
          {t('workspace.contacts')}
        </h2>
        <DescriptionList
          emptyLabel={t('workspace.notAdded')}
          items={[
            {
              id: 'email',
              term: t('workspace.email'),
              description: student.email ? (
                <ContactValue kind="email" value={student.email} label={t('workspace.email')} />
              ) : null,
            },
            {
              id: 'phone',
              term: t('workspace.phone'),
              description: student.phone ? (
                <ContactValue kind="phone" value={student.phone} label={t('workspace.phone')} />
              ) : null,
            },
            {
              id: 'handles',
              term: t('workspace.handles'),
              description:
                student.contactHandles.length > 0 ? (
                  <ul className={styles.handlesList}>
                    {student.contactHandles.map((h, index) => (
                      <li key={index}>
                        <span className={styles.handleLabel}>{h.label}: </span>
                        {h.value ? (
                          <ContactValue kind="handle" value={h.value} label={h.label ?? ''} />
                        ) : (
                          <span className={styles.mutedText}>{t('workspace.notAdded')}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null,
            },
          ]}
        />
      </section>
      <section aria-labelledby="workspace-note">
        <h2 id="workspace-note" className={styles.sectionTitle}>
          {t('workspace.note')}
        </h2>
        {student.note ? (
          <p className={styles.note}>{student.note}</p>
        ) : (
          <p className={styles.mutedText}>{t('workspace.notAdded')}</p>
        )}
      </section>
    </>
  )
}

/** The header and the first rows' shape (after 150 ms); the region is busy and labelled at once. */
function WorkspaceSkeleton() {
  const { t } = useTranslation('students')
  return (
    <output aria-busy="true" aria-label={t('workspace.loading')} className={styles.skeletonRows}>
      <DelayedSkeleton>
        <Skeleton shape="block" inlineSize="60%" blockSize="var(--size-control-md)" />
        <Skeleton inlineSize="12em" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} shape="block" inlineSize="100%" blockSize="var(--size-control-lg)" />
        ))}
      </DelayedSkeleton>
    </output>
  )
}

/**
 * Route focus moves to `main h1` right after a navigation, but this page's `h1` arrives with its data. When the data (or
 * the not-found or error view) arrives after a client-side navigation and focus was lost to the body meanwhile, it moves
 * to the new `h1` (never on a first load: focus stays on the body there).
 */
function useFocusWhenLoaded(loaded: boolean) {
  const done = useRef(false)
  useEffect(() => {
    if (!loaded || done.current) return
    done.current = true
    if (hasClientNavigated() && document.activeElement === document.body)
      document.querySelector<HTMLElement>('main h1')?.focus()
  }, [loaded])
}
