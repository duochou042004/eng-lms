import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDateTime } from '../../../lib/time'
import { Button, ButtonLink, CopyButton, DescriptionList, InlineAlert } from '../../../ui'
import { useWorkspaceDisplayName, type CreatedStudent } from '../api/students'
import { credentialsMessage } from '../model/credentialsMessage'
import styles from './Students.module.css'

export interface CredentialsCardProps {
  created: CreatedStudent
  onAddAnother: () => void
}

/**
 * The credentials card (FR-STU-01, F2 step 6, security.md T12): shown once after a create, as its success feedback
 * (focus on its heading, DEC-120 (7)). The temporary password lives only in the props it gets from the page's state:
 * leaving the page drops it for good. It is text (no input, no autocomplete); the copy actions use the clipboard and
 * fall back to selecting the text.
 */
export function CredentialsCard({ created, onAddAnother }: CredentialsCardProps) {
  const { t, i18n } = useTranslation('students')
  const workspace = useWorkspaceName()
  const titleId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => titleRef.current?.focus(), [])
  const { student, credentials } = created
  const loginUrl = `${window.location.origin}/login`
  const message = credentialsMessage(t, i18n.language, {
    workspace,
    loginUrl,
    username: credentials.username,
    temporaryPassword: credentials.temporaryPassword,
    expiresAt: credentials.expiresAt,
  })
  return (
    <section aria-labelledby={titleId} className={styles.card}>
      <h2 id={titleId} ref={titleRef} tabIndex={-1} className={styles.cardTitle}>
        {t('card.title')}
      </h2>
      <p>{t('card.intro', { name: student.fullName })}</p>
      <DescriptionList
        emptyLabel={t('workspace.notAdded')}
        items={[
          { id: 'name', term: t('card.name'), description: student.fullName },
          { id: 'username', term: t('card.username'), description: credentials.username },
          {
            id: 'password',
            term: t('card.password'),
            description: <span className={styles.secret}>{credentials.temporaryPassword}</span>,
          },
          { id: 'expires', term: t('card.expires'), description: formatDateTime(credentials.expiresAt, i18n.language) },
          { id: 'url', term: t('card.loginUrl'), description: loginUrl },
        ]}
      />
      <InlineAlert tone="warning" title={t('card.notice')} />
      <div className={styles.actions}>
        <CopyButton
          variant="primary"
          text={message}
          label={t('card.copyMessage')}
          copiedMessage={t('card.copied')}
          failedMessage={t('card.copyFailed')}
        />
        <CopyButton
          text={credentials.temporaryPassword}
          label={t('card.copyPassword')}
          copiedMessage={t('card.copied')}
          failedMessage={t('card.copyFailed')}
        />
      </div>
      <div className={styles.actions}>
        <ButtonLink variant="secondary" to={`/tutor/students/${student.id}`}>
          {t('card.openWorkspace')}
        </ButtonLink>
        <Button variant="quiet" onPress={onAddAnother}>
          {t('card.addAnother')}
        </Button>
      </div>
    </section>
  )
}

/** The workspace's display name for the message; the app name while it loads or fails. */
function useWorkspaceName() {
  const { t } = useTranslation()
  return useWorkspaceDisplayName().data ?? t('app.name')
}
