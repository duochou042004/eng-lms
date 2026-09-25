import { Plus, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../app/components/LanguageSwitcher'
import { Button, EmptyState, IconButton, InlineAlert, PageHeader, Skeleton, Stack, TextField } from '../ui'
import styles from './DevUiPage.module.css'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.row}>{children}</div>
    </section>
  )
}

/** Component gallery (`/dev/ui`, development builds only): every ui/ primitive in each of its states. */
export function DevUiPage() {
  const { t } = useTranslation('dev')
  return (
    <main id="main" className={styles.page}>
      <Stack gap={7}>
        <PageHeader title={t('title')} description={t('description')} actions={<LanguageSwitcher />} />
        <Section title={t('sections.buttons')}>
          <Button>{t('sample.primary')}</Button>
          <Button variant="secondary">{t('sample.secondary')}</Button>
          <Button variant="quiet">{t('sample.quiet')}</Button>
          <Button variant="danger">{t('sample.danger')}</Button>
          <Button size="lg">{t('sample.large')}</Button>
          <Button isDisabled>{t('sample.disabled')}</Button>
          <Button isPending>{t('sample.pending')}</Button>
          <IconButton label={t('sample.iconLabel')} icon={<Plus />} />
          <IconButton label={t('sample.iconLabel')} icon={<Plus />} variant="secondary" />
        </Section>
        <Section title={t('sections.fields')}>
          <TextField label={t('sample.fieldLabel')} hint={t('sample.fieldHint')} />
          <TextField label={t('sample.invalidLabel')} isInvalid errorMessage={t('sample.fieldError')} />
          <TextField label={t('sample.disabledLabel')} isDisabled defaultValue="S-0001" />
        </Section>
        <Section title={t('sections.alerts')}>
          <Stack gap={3}>
            <InlineAlert tone="info" title={t('sample.alertInfo')}>
              {t('sample.alertBody')}
            </InlineAlert>
            <InlineAlert tone="success" title={t('sample.alertSuccess')} />
            <InlineAlert tone="warning" title={t('sample.alertWarning')} />
            <InlineAlert tone="danger" title={t('sample.alertDanger')}>
              {t('sample.alertBody')}
            </InlineAlert>
          </Stack>
        </Section>
        <Section title={t('sections.loading')}>
          <output aria-busy="true" aria-label={t('sample.loadingLabel')} className={styles.skeletons}>
            <Skeleton />
            <Skeleton inlineSize="20em" />
            <Skeleton shape="block" inlineSize="100%" blockSize="4rem" />
            <Skeleton shape="circle" inlineSize="2.5rem" blockSize="2.5rem" />
          </output>
        </Section>
        <Section title={t('sections.empty')}>
          <EmptyState
            headingLevel={3}
            icon={<Users />}
            title={t('sample.emptyTitle')}
            description={t('sample.emptyDescription')}
            action={<Button>{t('sample.emptyAction')}</Button>}
          />
        </Section>
      </Stack>
    </main>
  )
}
