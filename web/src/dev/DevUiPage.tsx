import { CalendarCheck, CircleUser, Ellipsis, House, Plus, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../app/components/LanguageSwitcher'
import { usePageTitle } from '../app/routeAnnouncement'
import {
  BottomTabs,
  Button,
  ButtonLink,
  Checkbox,
  EmptyState,
  ErrorSummary,
  IconButton,
  InlineAlert,
  NavList,
  PageHeader,
  PasswordField,
  Popover,
  SegmentedControl,
  Sheet,
  Skeleton,
  Stack,
  TextField,
} from '../ui'
import styles from './DevUiPage.module.css'
import { registerDevNamespace } from './i18n'

// The `dev` strings are registered when this lazily imported module loads, so they never ship in production.
registerDevNamespace()

type View = 'list' | 'week' | 'month'

function SegmentedSamples() {
  const { t } = useTranslation('dev')
  const [view, setView] = useState<View>('list')
  const options: Array<{ id: View; label: string }> = [
    { id: 'list', label: t('sample.segmentedList') },
    { id: 'week', label: t('sample.segmentedWeek') },
    { id: 'month', label: t('sample.segmentedMonth') },
  ]
  return (
    <Stack gap={3}>
      <SegmentedControl label={t('sample.segmentedLabel')} options={options} selected={view} onChange={setView} />
      <SegmentedControl
        label={t('sample.segmentedPartialLabel')}
        options={options.map((o) => ({ ...o, isDisabled: o.id === 'month' }))}
        selected="week"
        onChange={() => {}}
      />
      <SegmentedControl
        label={t('sample.segmentedDisabledLabel')}
        options={options}
        selected="list"
        onChange={() => {}}
        isDisabled
      />
      {/* Not stretched to the column (whose width follows the UI language), so its segments keep their size. */}
      <div className={styles.fit}>
        <LanguageSwitcher />
      </div>
    </Stack>
  )
}

/** NavList and BottomTabs (T-M2.11): "Today" links to this page, so it is the current item. */
function NavigationSamples() {
  const { t } = useTranslation('dev')
  const [moreOpen, setMoreOpen] = useState(false)
  const items = [
    { id: 'today', label: t('sample.navToday'), icon: <CalendarCheck />, to: '/dev/ui' },
    { id: 'students', label: t('sample.navStudents'), icon: <Users />, to: '/login' },
  ]
  return (
    <Stack gap={4}>
      <div className={styles.navColumn}>
        <NavList label={t('sample.navListLabel')} items={items} />
      </div>
      <NavList label={t('sample.navListHorizontalLabel')} items={items} orientation="horizontal" />
      {/* The bar is fixed to the viewport in the app; the transformed frame holds it in the gallery. */}
      <div className={styles.tabsFrame}>
        <BottomTabs
          label={t('sample.tabsLabel')}
          items={[{ ...items[0]!, id: 'home', icon: <House /> }]}
          action={{
            label: t('sample.tabsMore'),
            icon: <Ellipsis />,
            onPress: () => setMoreOpen((open) => !open),
            isExpanded: moreOpen,
          }}
        />
      </div>
    </Stack>
  )
}

/** Sheet (start and bottom) and Popover (T-M2.11), each opened from a button. */
function OverlaySamples() {
  const { t } = useTranslation('dev')
  const [sheet, setSheet] = useState<'start' | 'bottom' | null>(null)
  const [popover, setPopover] = useState<'short' | 'long' | null>(null)
  return (
    <>
      <Button variant="secondary" onPress={() => setSheet('start')}>
        {t('sample.openDrawer')}
      </Button>
      <Button variant="secondary" onPress={() => setSheet('bottom')}>
        {t('sample.openBottomSheet')}
      </Button>
      <Sheet
        placement={sheet ?? 'start'}
        isOpen={sheet !== null}
        onOpenChange={(open) => setSheet(open ? sheet : null)}
        title={sheet === 'bottom' ? t('sample.bottomSheetTitle') : t('sample.drawerTitle')}
        closeLabel={t('sample.close')}
        footer={sheet === 'start' ? <Button variant="secondary">{t('sample.secondary')}</Button> : undefined}
      >
        <p>{t('sample.sheetBody')}</p>
      </Sheet>
      {(['short', 'long'] as const).map((id) => (
        <Popover
          key={id}
          triggerLabel={id === 'short' ? t('sample.popoverTrigger') : t('sample.popoverLongTrigger')}
          triggerIcon={<CircleUser />}
          label={t('sample.popoverLabel')}
          isOpen={popover === id}
          onOpenChange={(open) => setPopover(open ? id : null)}
        >
          <Stack gap={3}>
            <p>{t('sample.popoverBody')}</p>
            <Button variant="secondary" onPress={() => setPopover(null)}>
              {t('sample.close')}
            </Button>
          </Stack>
        </Popover>
      ))}
    </>
  )
}

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
  usePageTitle(t('title'))
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
        <Section title={t('sections.buttonLink')}>
          <ButtonLink to="/login" variant="secondary">
            {t('sample.linkSecondary')}
          </ButtonLink>
          <ButtonLink to="/login" variant="quiet">
            {t('sample.linkQuiet')}
          </ButtonLink>
          <ButtonLink to="/login">{t('sample.primary')}</ButtonLink>
        </Section>
        <Section title={t('sections.navigation')}>
          <NavigationSamples />
        </Section>
        <Section title={t('sections.overlays')}>
          <OverlaySamples />
        </Section>
        <Section title={t('sections.fields')}>
          <TextField label={t('sample.fieldLabel')} hint={t('sample.fieldHint')} />
          <TextField label={t('sample.invalidLabel')} isInvalid errorMessage={t('sample.fieldError')} />
          <TextField label={t('sample.disabledLabel')} isDisabled defaultValue="S-0001" />
        </Section>
        <Section title={t('sections.password')}>
          <PasswordField
            label={t('sample.passwordLabel')}
            revealLabel={t('sample.passwordReveal')}
            hint={t('sample.passwordHint')}
            autoComplete="current-password"
          />
          <PasswordField
            label={t('sample.passwordInvalidLabel')}
            revealLabel={t('sample.passwordReveal')}
            autoComplete="new-password"
            isInvalid
            errorMessage={t('sample.passwordError')}
          />
          <PasswordField
            label={t('sample.passwordDisabledLabel')}
            revealLabel={t('sample.passwordReveal')}
            autoComplete="current-password"
            isDisabled
          />
        </Section>
        <Section title={t('sections.checkbox')}>
          <Stack gap={3}>
            <Checkbox label={t('sample.checkboxLabel')} hint={t('sample.checkboxHint')} />
            <Checkbox label={t('sample.checkboxSelectedLabel')} defaultSelected />
            <Checkbox label={t('sample.checkboxInvalidLabel')} isInvalid errorMessage={t('sample.checkboxError')} />
            <Checkbox label={t('sample.checkboxDisabledLabel')} isDisabled />
          </Stack>
        </Section>
        <Section title={t('sections.errorSummary')}>
          <Stack gap={3}>
            <ErrorSummary
              title={t('sample.summaryTitle')}
              errors={[
                { fieldId: 'dev-summary-field', message: t('sample.summaryFieldError') },
                { message: t('sample.summaryFormError') },
              ]}
            />
            <TextField id="dev-summary-field" label={t('sample.summaryFieldLabel')} />
          </Stack>
        </Section>
        <Section title={t('sections.segmented')}>
          <SegmentedSamples />
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
