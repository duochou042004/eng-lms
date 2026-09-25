import { useTranslation } from 'react-i18next'
import { useMeta } from '../../features/settings/api/useMeta'
import { Button, Skeleton } from '../../ui'
import styles from './WorkspaceName.module.css'

/** The workspace display name from `GET /api/v1/meta`, with loading and a compact (header-sized) error state. */
export function WorkspaceName() {
  const { t } = useTranslation()
  const meta = useMeta()
  if (meta.isPending) {
    return (
      <output aria-busy="true" aria-label={t('meta.loading')}>
        <Skeleton inlineSize="8em" />
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
