import { CalendarCheck, CircleUser, Ellipsis, House, Plus, Users } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../app/components/LanguageSwitcher'
import { usePageTitle } from '../app/routeAnnouncement'
import {
  BottomTabs,
  Button,
  ButtonLink,
  Checkbox,
  ConfirmDialog,
  CopyButton,
  DataList,
  DescriptionList,
  Disclosure,
  EmptyState,
  ErrorSummary,
  IconButton,
  InlineAlert,
  NavList,
  PageHeader,
  PasswordField,
  Popover,
  ProgressLine,
  SearchField,
  SegmentedControl,
  Sheet,
  Skeleton,
  Stack,
  StatusBadge,
  STUDENT_STATUS,
  TagInput,
  TagList,
  TextArea,
  TextField,
  toast,
  ToastRegion,
  UnsavedChangesGuard,
} from '../ui'
import styles from './DevUiPage.module.css'
import { registerDevNamespace } from './i18n'

// The `dev` strings are registered when this lazily imported module loads, so they never ship in production.
registerDevNamespace()

type View = 'list' | 'week' | 'month'

/** The navigation progress line (T-M2.12): fixed at the window's top edge, so it is shown on demand. */
function ProgressLineSample() {
  const { t } = useTranslation('dev')
  const [shown, setShown] = useState(false)
  return (
    <Stack gap={3}>
      <p>{t('sample.progressHint')}</p>
      <div>
        <Button variant="secondary" onPress={() => setShown((s) => !s)}>
          {shown ? t('sample.progressHide') : t('sample.progressShow')}
        </Button>
      </div>
      {shown ? <ProgressLine /> : null}
    </Stack>
  )
}

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

/** The T-M2.5 components: StatusBadge, SearchField, DataList, Disclosure, TextArea, CopyButton, ConfirmDialog, DescriptionList. */
function StudentsSamples() {
  const { t } = useTranslation('dev')
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [confirm, setConfirm] = useState(false)
  const badge = (status: keyof typeof STUDENT_STATUS, label: string) => (
    <StatusBadge status={STUDENT_STATUS[status]} label={label} />
  )
  const columns = [
    { id: 'name', header: t('sample.colName') },
    { id: 'username', header: t('sample.colUsername') },
    { id: 'status', header: t('sample.colStatus') },
    { id: 'email', header: t('sample.colEmail') },
  ] as const
  const rows = [
    {
      id: '1',
      cells: {
        name: 'Nguyễn Văn An',
        username: 'nguyenvanan',
        status: badge('ACTIVE', t('sample.statusActive')),
        email: 'an@example.com',
      },
    },
    {
      id: '2',
      cells: {
        name: t('sample.rowLong'),
        username: 'nguyenthiphuonglananhhoangbaongoc',
        status: badge('PAUSED', t('sample.statusPaused')),
        email: 'nguyen.thi.phuong.lan.anh.hoang.bao.ngoc@example.com',
      },
    },
    {
      id: '3',
      cells: {
        name: 'Trần Bình',
        username: 'tranbinh',
        status: badge('ARCHIVED', t('sample.statusArchived')),
        email: null,
      },
    },
  ]
  return (
    <Stack gap={5}>
      <div className={styles.row}>
        {badge('ACTIVE', t('sample.statusActive'))}
        {badge('PAUSED', t('sample.statusPaused'))}
        {badge('ARCHIVED', t('sample.statusArchived'))}
      </div>
      <SearchField
        label={t('sample.searchLabel')}
        hint={t('sample.searchHint')}
        clearLabel={t('sample.searchClear')}
        value={query}
        onChange={setQuery}
      />
      <DataList label={t('sample.dataListLabel')} columns={columns} rows={rows} />
      <Disclosure title={t('sample.disclosureTitle')}>
        <p>{t('sample.disclosureBody')}</p>
      </Disclosure>
      <TextArea
        label={t('sample.textAreaLabel')}
        hint={t('sample.textAreaHint')}
        maxLength={2000}
        value={note}
        onChange={setNote}
      />
      <TextArea label={t('sample.textAreaInvalid')} isInvalid errorMessage={t('sample.textAreaError')} />
      <TextArea label={t('sample.textAreaDisabled')} isDisabled defaultValue="…" />
      <div className={styles.row}>
        <CopyButton
          variant="primary"
          text="Eng-LMS"
          label={t('sample.copyLabel')}
          copiedMessage={t('sample.copied')}
          failedMessage={t('sample.copyFailed')}
        />
        <Button variant="secondary" onPress={() => setConfirm(true)}>
          {t('sample.confirmOpen')}
        </Button>
      </div>
      <ConfirmDialog
        isOpen={confirm}
        title={t('sample.confirmTitle')}
        description={t('sample.confirmBody')}
        confirmLabel={t('sample.confirmDiscard')}
        cancelLabel={t('sample.confirmKeep')}
        onConfirm={() => setConfirm(false)}
        onCancel={() => setConfirm(false)}
      />
      <DescriptionList
        emptyLabel={t('sample.dlEmpty')}
        items={[
          { id: 'name', term: t('sample.dlName'), description: 'Nguyễn Văn An' },
          { id: 'email', term: t('sample.dlEmail'), description: null },
          { id: 'note', term: t('sample.dlNote'), description: t('sample.disclosureBody') },
        ]}
      />
    </Stack>
  )
}

/** The T-M2.14 components: Toast (with and without an action), UnsavedChangesGuard and the ConfirmDialog variants. */
function ProfileSamples() {
  const { t } = useTranslation('dev')
  const [dirty, setDirty] = useState(false)
  const [dialog, setDialog] = useState<'primary' | 'pending' | 'content' | null>(null)
  const close = () => setDialog(null)
  return (
    <Stack gap={5}>
      <div className={styles.row}>
        <Button variant="secondary" onPress={() => toast.success(t('sample.toastMessage'))}>
          {t('sample.toastShow')}
        </Button>
        <Button
          variant="secondary"
          onPress={() => {
            const key = toast.success(t('sample.toastActionMessage'), {
              action: {
                label: t('sample.toastUndo'),
                onAction: () => {
                  toast.close(key)
                  toast.success(t('sample.toastUndone'))
                },
              },
            })
          }}
        >
          {t('sample.toastShowAction')}
        </Button>
      </div>
      <Stack gap={3}>
        <Checkbox label={t('sample.guardDirty')} isSelected={dirty} onChange={setDirty} />
        <div>
          <ButtonLink variant="secondary" to="/">
            {t('sample.guardLeave')}
          </ButtonLink>
        </div>
        <UnsavedChangesGuard
          isDirty={dirty}
          title={t('sample.guardTitle')}
          description={t('sample.guardBody')}
          confirmLabel={t('sample.guardDiscard')}
          cancelLabel={t('sample.guardKeep')}
        />
      </Stack>
      <div className={styles.row}>
        <Button variant="secondary" onPress={() => setDialog('primary')}>
          {t('sample.confirmPrimaryOpen')}
        </Button>
        <Button variant="secondary" onPress={() => setDialog('pending')}>
          {t('sample.confirmPendingOpen')}
        </Button>
        <Button variant="secondary" onPress={() => setDialog('content')}>
          {t('sample.confirmContentOpen')}
        </Button>
      </div>
      <ConfirmDialog
        isOpen={dialog === 'primary'}
        title={t('sample.conflictTitle')}
        description={t('sample.conflictBody')}
        confirmLabel={t('sample.conflictReload')}
        confirmVariant="primary"
        cancelLabel={t('sample.conflictCancel')}
        onConfirm={close}
        onCancel={close}
      >
        <div>
          <CopyButton
            text={t('sample.dlNote')}
            label={t('sample.conflictCopy')}
            copiedMessage={t('sample.copied')}
            failedMessage={t('sample.copyFailed')}
          />
        </div>
      </ConfirmDialog>
      {/* Pending: Esc and Cancel do nothing; the gallery closes it after a few seconds so it can be seen and left. */}
      <PendingDialog isOpen={dialog === 'pending'} onDone={close} />
      <ConfirmDialog
        isOpen={dialog === 'content'}
        title={t('sample.resetTitle')}
        description={t('sample.resetBody')}
        confirmLabel={t('sample.resetConfirm')}
        cancelLabel={t('sample.resetCancel')}
        onConfirm={close}
        onCancel={close}
      >
        <InlineAlert tone="danger" title={t('sample.resetFailed')} />
      </ConfirmDialog>
      <ToastRegion label={t('sample.toastRegion')} dismissLabel={t('sample.toastDismiss')} />
    </Stack>
  )
}

function PendingDialog({ isOpen, onDone }: { isOpen: boolean; onDone: () => void }) {
  const { t } = useTranslation('dev')
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(onDone, 4000)
    return () => clearTimeout(timer)
  }, [isOpen, onDone])
  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={t('sample.resetTitle')}
      description={t('sample.resetBody')}
      confirmLabel={t('sample.resetConfirm')}
      cancelLabel={t('sample.resetCancel')}
      isPending
      pendingLabel={t('sample.resetPending')}
      onConfirm={() => {}}
      onCancel={onDone}
    />
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

/** The T-M2.17 TagInput (empty input, chips, remove, the entry errors), its invalid and disabled states, and TagList. */
function TagSamples() {
  const { t } = useTranslation('dev')
  const [tags, setTags] = useState([t('sample.tagFirst'), t('sample.tagSecond'), t('sample.tagLong')])
  const [text, setText] = useState('')
  const messages = {
    remove: (tag: string) => t('sample.tagRemove', { tag }),
    control: t('sample.tagControl'),
    tooLong: t('sample.tagTooLong'),
    duplicate: t('sample.tagDuplicate'),
    tooMany: t('sample.tagTooMany'),
  }
  const fixed = { onChange: () => {}, inputValue: '', onInputChange: () => {}, maxTags: 30, maxLength: 40, messages }
  return (
    <Stack gap={5}>
      <TagInput
        id="dev-tag-input"
        label={t('sample.tagLabel')}
        hint={t('sample.tagHint')}
        value={tags}
        onChange={setTags}
        inputValue={text}
        onInputChange={setText}
        maxTags={30}
        maxLength={40}
        messages={messages}
      />
      <TagInput
        {...fixed}
        label={t('sample.tagInvalidLabel')}
        value={[t('sample.tagFirst')]}
        errorMessage={t('sample.tagError')}
      />
      <TagInput {...fixed} label={t('sample.tagDisabledLabel')} value={[t('sample.tagSecond')]} isDisabled />
      <div>
        <p>{t('sample.tagListLabel')}</p>
        <TagList tags={[t('sample.tagFirst'), t('sample.tagSecond'), t('sample.tagLong')]} />
      </div>
    </Stack>
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
          <ProgressLineSample />
        </Section>
        <Section title={t('sections.students')}>
          <StudentsSamples />
        </Section>
        <Section title={t('sections.profile')}>
          <ProfileSamples />
        </Section>
        <Section title={t('sections.tagInput')}>
          <TagSamples />
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
