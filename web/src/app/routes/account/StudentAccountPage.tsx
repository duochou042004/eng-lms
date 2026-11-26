import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useStudentAccount } from '../../../features/students/api/studentAccount'
import { usePageTitle } from '../../../lib/i18n/pageTitle'
import { Button, DelayedSkeleton, DescriptionList, InlineAlert, PageHeader, Skeleton } from '../../../ui'
import { AccountPanel } from './AccountForm'
import styles from './Account.module.css'
import './i18n'

/**
 * `/student/account` (FR-SET-02, T-M2.7 scope 5; IA §3 More › Account): the student's name and username (read only, the
 * tutor's data, FR-STU-03), then the shared account form for a student (Language, Time zone, Change password).
 */
export function StudentAccountPage() {
  const { t } = useTranslation('account')
  usePageTitle(t('student.title'))
  return (
    <AccountPanel
      header={
        <>
          <PageHeader title={t('student.title')} />
          <AccountDetails />
        </>
      }
    />
  )
}

/**
 * Name and Username from `GET /student/account`: a skeleton of the two rows while loading; a failed read shows its alert
 * with Retry here only (the rest of the page works). Retry keeps the alert, so its button keeps focus, until the answer:
 * then the block itself takes focus (the button is gone; never `<body>`, UI rules).
 */
function AccountDetails() {
  const { t } = useTranslation('account')
  const account = useStudentAccount()
  const block = useRef<HTMLDivElement>(null)
  const retried = useRef(false)
  useEffect(() => {
    if (!retried.current || !account.data) return
    retried.current = false
    block.current?.focus()
  }, [account.data])
  return (
    <div ref={block} tabIndex={-1} className={styles.details}>
      {account.data ? (
        <DescriptionList
          emptyLabel=""
          items={[
            { id: 'name', term: t('student.name'), description: account.data.fullName },
            {
              id: 'username',
              term: t('student.username'),
              description: <span className={styles.username}>{account.data.username}</span>,
            },
          ]}
        />
      ) : account.isError ? (
        <InlineAlert
          tone="danger"
          title={t('student.loadError')}
          action={
            <Button
              variant="secondary"
              isPending={account.isFetching}
              onPress={() => {
                retried.current = true
                void account.refetch()
              }}
            >
              {t('student.retry')}
            </Button>
          }
        />
      ) : (
        <output aria-busy="true" aria-label={t('student.loading')} className={styles.skeletonRows}>
          <DelayedSkeleton>
            <Skeleton inlineSize="60%" />
            <Skeleton inlineSize="40%" />
          </DelayedSkeleton>
        </output>
      )}
    </div>
  )
}
