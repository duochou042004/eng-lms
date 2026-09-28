import { useTranslation } from 'react-i18next'
import { useMeta } from '../../features/settings/api/useMeta'
import { Button, DelayedSkeleton, Skeleton } from '../../ui'
import styles from './WorkspaceName.module.css'

/**
 * The workspace display name from `GET /api/v1/meta`, with loading and a compact (header-sized) error state. While
 * loading, the region is `aria-busy` and one text line tall from 0 ms; the skeleton appears after 150 ms.
 */
export function WorkspaceName() {
  const { t } = useTranslation()
  const meta = useMeta()
  if (meta.isPending) {
    return (
      <output aria-busy="true" aria-label={t('meta.loading')} className={styles.loading}>
        <DelayedSkeleton>
          <Skeleton inlineSize="8em" />
        </DelayedSkeleton>
      </output>
    )
  }
  if (meta.isError) {
    return (
      <div role="alert" className={styles.error}>
        <span>{t('meta.error')}</span>
        <Button variant="quiet" onPress={() => void meta.refetch()}>
          {t('meta.retry')}
        </Button>
      </div>
    )
  }
  return <span>{meta.data.displayName}</span>
}
