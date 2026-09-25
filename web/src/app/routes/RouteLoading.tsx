import { useTranslation } from 'react-i18next'
import { Skeleton, Stack } from '../../ui'
import styles from './Page.module.css'

/** Shown while a lazy route module loads on first visit (interaction-states §1: a layout-shaped skeleton, not a blank page). */
export function RouteLoading() {
  const { t } = useTranslation()
  return (
    <output aria-busy="true" aria-label={t('app.loading')} className={styles.page}>
      <Stack gap={4}>
        <Skeleton inlineSize="14em" blockSize="1.75rem" />
        <Skeleton shape="block" inlineSize="100%" blockSize="8rem" />
      </Stack>
    </output>
  )
}
