import { useTranslation } from 'react-i18next'
import { useMeta } from '../../features/settings/api/useMeta'
import { Button, DelayedSkeleton, Skeleton } from '../../ui'
import styles from './WorkspaceName.module.css'

/** The loading state: busy and labelled from 0 ms, one text line tall; the skeleton appears after 150 ms. */
export function WorkspaceNameLoading() {
  const { t } = useTranslation()
  return (
    <output aria-busy="true" aria-label={t('meta.loading')} className={styles.loading}>
      <DelayedSkeleton>
        <Skeleton inlineSize="8em" />
      </DelayedSkeleton>
    </output>
  )
}

/**
 * The compact (header-sized) error: the message, truncated with a full-text tooltip when the row is narrow, and Retry.
 * Never inside a link (the shell puts it beside its home link).
 */
export function WorkspaceNameError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div role="alert" className={styles.error}>
      <span className={styles.truncate} title={t('meta.error')}>
        {t('meta.error')}
      </span>
      <Button variant="quiet" onPress={onRetry}>
        {t('meta.retry')}
      </Button>
    </div>
  )
}

/**
 * The workspace display name from `GET /api/v1/meta` with its loading and compact error states (the public frame;
 * the shells show it as their home link, `ShellHomeLink`). A long name truncates with an ellipsis and a full-text
 * `title` (responsive-standards §3 item 8).
 */
export function WorkspaceName() {
  const meta = useMeta()
  if (meta.isPending) return <WorkspaceNameLoading />
  if (meta.isError) return <WorkspaceNameError onRetry={() => void meta.refetch()} />
  return (
    <span className={styles.truncate} title={meta.data.displayName}>
      {meta.data.displayName}
    </span>
  )
}
