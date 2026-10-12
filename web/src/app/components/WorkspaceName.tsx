import { CircleAlert } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useMeta } from '../../features/settings/api/useMeta'
import { Button, DelayedSkeleton, Skeleton, cx } from '../../ui'
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
 * The compact (header-sized) error: the message and Retry, never inside a link. `wrap` (the public frame): below 480 px
 * the message may take two lines. In a shell top bar too narrow for the message (the `workspace-error` container, set by
 * the shell, under 22rem) only an icon shows before Retry: the message stays in the alert as visually hidden text and
 * describes Retry (AC11 (c)).
 */
export function WorkspaceNameError({ onRetry, wrap = false }: { onRetry: () => void; wrap?: boolean }) {
  const { t } = useTranslation()
  const messageId = useId()
  return (
    <div role="alert" className={styles.error}>
      <CircleAlert aria-hidden="true" className={styles.errorIcon} />
      <span
        id={messageId}
        className={cx(styles.message, wrap ? styles.clamp : styles.truncate)}
        title={t('meta.error')}
      >
        {t('meta.error')}
      </span>
      <Button variant="quiet" onPress={onRetry} aria-describedby={messageId}>
        {t('meta.retry')}
      </Button>
    </div>
  )
}

/**
 * The workspace display name from `GET /api/v1/meta` with its loading and compact error states, in the public frame (the
 * shells show it as their home link, `ShellHomeLink`). At ≥ 480 px one line with an ellipsis; below, up to two lines
 * (AC11 (a)); always with a full-text `title` (responsive-standards §3 item 8).
 */
export function WorkspaceName() {
  const meta = useMeta()
  if (meta.isPending) return <WorkspaceNameLoading />
  if (meta.isError) return <WorkspaceNameError wrap onRetry={() => void meta.refetch()} />
  return (
    <span className={styles.clamp} title={meta.data.displayName}>
      {meta.data.displayName}
    </span>
  )
}
