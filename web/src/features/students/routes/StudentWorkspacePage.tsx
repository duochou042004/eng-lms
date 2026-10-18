import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError } from '../../../lib/api'
import { usePageTitle } from '../../../lib/i18n/pageTitle'
import { hasClientNavigated } from '../../../lib/navigation'
import { formatDate } from '../../../lib/time'
import { Button, DelayedSkeleton, DescriptionList, InlineAlert, PageHeader, Skeleton, Stack, toast } from '../../../ui'
import { useStudent, type Student } from '../api/students'
import { AccountSection } from '../components/AccountSection'
import { ContactValue } from '../components/ContactValue'
import type { CardCredentials } from '../components/CredentialsCard'
import { ProfileForm } from '../components/ProfileForm'
import { StudentNotFound } from '../components/StudentNotFound'
import { StudentStatusBadge } from '../components/StudentStatusBadge'
import styles from '../components/Students.module.css'
import '../i18n'
import { contactHref } from '../model/contactHref'

const EDIT_ID = 'workspace-edit-profile'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * `/tutor/students/:studentId` (FR-STU-03, 05, 06, 07; T-M2.5 scopes 6–7, T-M2.14): the workspace header (name, status,
 * username, contact quick links) and the Profile view, with Edit profile and the Account section. No tab bar while
 * Profile is the only content (DEC-120 (3), (8)). A 404 or a `:studentId` that is not a UUID (no request) shows the
 * feature's not-found view inside the shell. Each student gets a fresh page state (keyed), so nothing of one student's
 * form, toast or reset card reaches another's.
 */
export function StudentWorkspacePage() {
  const { studentId = '' } = useParams()
  return <StudentWorkspace key={studentId} studentId={studentId} />
}

function StudentWorkspace({ studentId }: { studentId: string }) {
  const { t } = useTranslation('students')
  const valid = UUID.test(studentId)
  const student = useStudent(studentId, valid)
  // A write answered 404: the student is gone (the not-found view, as for the read).
  const [gone, setGone] = useState(false)
  const notFound = !valid || gone || (student.error instanceof ApiError && student.error.status === 404)
  usePageTitle(notFound ? t('workspace.notFoundTitle') : (student.data?.fullName ?? t('workspace.title')))
  useFocusWhenLoaded(student.data !== undefined || notFound || student.isError)

  if (notFound) return <StudentNotFound />
  return (
    <Stack gap={5}>
      <BackLink />
      {student.data ? (
        <Workspace student={student.data} onRefetch={() => student.refetch()} onNotFound={() => setGone(true)} />
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

interface WorkspaceProps {
  student: Student
  onRefetch: () => Promise<unknown>
  onNotFound: () => void
}

function Workspace({ student, onRefetch, onNotFound }: WorkspaceProps) {
  const { t, i18n } = useTranslation('students')
  const [editing, setEditing] = useState(false)
  const [accountBusy, setAccountBusy] = useState(false)
  // The reset's one-time credentials: this component's state only (security.md T12), never the cache, URL or storage.
  const [credentials, setCredentials] = useState<CardCredentials | null>(null)
  // Leaving the document (also into the back/forward cache) drops them first, so a restore never shows them.
  useEffect(() => {
    const drop = () => flushSync(() => setCredentials(null))
    window.addEventListener('pagehide', drop)
    return () => window.removeEventListener('pagehide', drop)
  }, [])
  const [focusEdit, setFocusEdit] = useState(0)
  useEffect(() => {
    if (focusEdit > 0) document.getElementById(EDIT_ID)?.focus()
  }, [focusEdit])
  // Only one form at a time: Edit profile waits for a status or reset request and for the reset card.
  const editLocked = accountBusy || credentials !== null
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
                <ContactValue {...c} withIcon />
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <section aria-labelledby="workspace-personal">
        <div className={styles.headingRow}>
          <h2 id="workspace-personal" className={styles.sectionTitle}>
            {t('workspace.personal')}
          </h2>
          {editing ? null : (
            <Button id={EDIT_ID} variant="secondary" isDisabled={editLocked} onPress={() => setEditing(true)}>
              {t('profile.edit')}
            </Button>
          )}
        </div>
        {editing ? (
          <ProfileForm
            student={student}
            onReload={onRefetch}
            onNotFound={onNotFound}
            onClose={(saved) => {
              setEditing(false)
              setFocusEdit((n) => n + 1)
              if (saved) toast.success(t('profile.saved'))
            }}
          />
        ) : (
          <DescriptionList
            emptyLabel={t('workspace.notAdded')}
            items={[
              { id: 'fullName', term: t('workspace.fullName'), description: student.fullName },
              { id: 'username', term: t('workspace.username'), description: student.username },
              {
                id: 'addedOn',
                term: t('workspace.addedOn'),
                description: formatDate(student.createdAt, i18n.language),
              },
            ]}
          />
        )}
      </section>
      {editing ? null : <ProfileDetails student={student} />}
      <AccountSection
        student={student}
        isEditing={editing}
        isBusy={accountBusy}
        onBusyChange={setAccountBusy}
        credentials={credentials}
        onCredentials={setCredentials}
        onRefetch={onRefetch}
        onNotFound={onNotFound}
      />
    </>
  )
}

/** The read-only Contacts and Note sections. */
function ProfileDetails({ student }: { student: Student }) {
  const { t } = useTranslation('students')
  return (
    <>
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
                      <li key={index} className={styles.handleItem}>
                        <span className={styles.handleLabel}>{h.label}</span>
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
