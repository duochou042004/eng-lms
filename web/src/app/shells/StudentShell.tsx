import { BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState, PageHeader, Stack } from '../../ui'
import { usePageTitle } from '../routeAnnouncement'
import { ShellLayout } from './ShellLayout'

/** Student shell placeholder (routes arrive with their milestones). A separate lazy chunk (NFR-PERF-03). */
export function StudentShell() {
  const { t } = useTranslation('shell')
  usePageTitle(t('student.title'))
  return (
    <ShellLayout navLabel={t('student.navLabel')}>
      <Stack gap={6}>
        <PageHeader title={t('student.title')} />
        <EmptyState icon={<BookOpen />} title={t('student.emptyTitle')} description={t('student.emptyDescription')} />
      </Stack>
    </ShellLayout>
  )
}
