import { NotebookPen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState, PageHeader, Stack } from '../../ui'
import { usePageTitle } from '../routeAnnouncement'
import { ShellLayout } from './ShellLayout'

/** Tutor shell placeholder (routes arrive with their milestones). A separate lazy chunk (NFR-PERF-03). */
export function TutorShell() {
  const { t } = useTranslation('shell')
  usePageTitle(t('tutor.title'))
  return (
    <ShellLayout navLabel={t('tutor.navLabel')}>
      <Stack gap={6}>
        <PageHeader title={t('tutor.title')} />
        <EmptyState icon={<NotebookPen />} title={t('tutor.emptyTitle')} description={t('tutor.emptyDescription')} />
      </Stack>
    </ShellLayout>
  )
}
