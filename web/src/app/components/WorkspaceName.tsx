import { useTranslation } from 'react-i18next'
import { useMeta } from '../../features/settings/api/useMeta'
import { Button, InlineAlert, Skeleton } from '../../ui'

/** The workspace display name from `GET /api/v1/meta`, with loading and error states. */
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
      <InlineAlert
        tone="danger"
        title={t('meta.error')}
        action={
          <Button variant="secondary" onPress={() => void meta.refetch()}>
            {t('meta.retry')}
          </Button>
        }
      />
    )
  }
  return <span>{meta.data.displayName}</span>
}
