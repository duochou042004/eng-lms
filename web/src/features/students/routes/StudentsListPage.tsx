import { Archive, SearchX, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearchParams } from 'react-router'
import { usePageTitle } from '../../../lib/i18n/pageTitle'
import {
  Button,
  ButtonLink,
  Checkbox,
  DataList,
  DelayedSkeleton,
  EmptyState,
  InlineAlert,
  PageHeader,
  ProgressLine,
  SearchField,
  SegmentedControl,
  Skeleton,
  Stack,
  useDelayed,
  type DataListColumn,
  type DataListRow,
} from '../../../ui'
import { useAnyStudent, useStudentList, type StudentRow } from '../api/students'
import { StudentStatusBadge } from '../components/StudentStatusBadge'
import styles from '../components/Students.module.css'
import '../i18n'
import { cleanQuery, parseListView, toSearchParams, type ListSort, type ListView } from '../model/listParams'

const SEARCH_DEBOUNCE_MS = 300
const SEARCH_ID = 'students-search'
type Column = 'name' | 'status' | 'email' | 'phone'

/**
 * `/tutor/students` (FR-STU-02 as the API serves it, DEC-097 (5); T-M2.5 scopes 2–3): the searchable, filterable,
 * sortable and paged list. Every control lives in the URL search params, so Back, reload and a shared link restore the
 * view; invalid params show the default view.
 */
export function StudentsListPage() {
  const { t } = useTranslation('students')
  usePageTitle(t('list.title'))
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const view = parseListView(params)
  const list = useStudentList(view)
  const data = list.data
  const settled = data !== undefined && !list.isPlaceholderData
  const isDefaultView = !view.q && !view.archived
  // An empty default view: one count request over all statuses tells first use from "only archived students".
  const any = useAnyStudent(settled && data.totalItems === 0 && isDefaultView)
  const refetching = useDelayed(list.isFetching && data !== undefined)

  const show = (next: ListView, replace = false) => setParams(toSearchParams(next), { replace })
  const change = (patch: Partial<ListView>, replace = false) => show({ ...view, page: 1, ...patch }, replace)

  // A page past the last one (a stale or edited link): the last page instead, in place of the current entry.
  const pastEnd = settled && data.items.length === 0 && data.totalItems > 0 && view.page > 1
  const lastPageSearch = pastEnd ? toSearchParams({ ...view, page: data.totalPages }).toString() : null
  useEffect(() => {
    if (lastPageSearch !== null) setParams(new URLSearchParams(lastPageSearch), { replace: true })
  }, [lastPageSearch, setParams])

  const search = useSearch(view.q, (q) => change({ q }, true))

  const clearFilters = () => {
    search.reset()
    setParams(new URLSearchParams())
    document.getElementById(SEARCH_ID)?.focus()
  }

  const firstUse = settled && data.totalItems === 0 && (view.archived ? !view.q : any.data === false)
  const sortOptions: Array<{ id: ListSort; label: string }> = [
    { id: 'name', label: t('list.sortName') },
    { id: 'newest', label: t('list.sortNewest') },
  ]

  return (
    <Stack gap={5}>
      <PageHeader
        title={t('list.title')}
        actions={
          firstUse ? null : (
            <ButtonLink to="/tutor/students/new">
              <UserPlus aria-hidden="true" className={styles.icon} />
              {t('list.add')}
            </ButtonLink>
          )
        }
      />
      {refetching ? <ProgressLine /> : null}
      {firstUse ? (
        <EmptyState
          icon={<UserPlus />}
          title={t('list.firstUseTitle')}
          description={t('list.firstUseDescription')}
          action={<ButtonLink to="/tutor/students/new">{t('list.add')}</ButtonLink>}
        />
      ) : (
        <>
          <div className={styles.controls}>
            <div className={styles.search}>
              <SearchField
                id={SEARCH_ID}
                label={t('list.searchLabel')}
                hint={t('list.searchHint')}
                clearLabel={t('list.clearSearch')}
                value={search.text}
                onChange={search.setText}
              />
            </div>
            <Checkbox
              label={t('list.includeArchived')}
              isSelected={view.archived}
              onChange={(archived) => change({ archived })}
            />
            <SegmentedControl
              label={t('list.sortLabel')}
              options={sortOptions}
              selected={view.sort}
              onChange={(sort) => change({ sort })}
            />
          </div>
          {list.isError ? (
            <InlineAlert
              tone="danger"
              title={t('list.errorTitle')}
              action={
                <Button variant="secondary" onPress={() => void list.refetch()}>
                  {t('list.retry')}
                </Button>
              }
            >
              {t('list.errorDescription')}
            </InlineAlert>
          ) : null}
          {any.isError ? (
            <InlineAlert
              tone="danger"
              title={t('list.errorTitle')}
              action={
                <Button variant="secondary" onPress={() => void any.refetch()}>
                  {t('list.retry')}
                </Button>
              }
            >
              {t('list.errorDescription')}
            </InlineAlert>
          ) : null}
          <ListBody
            view={view}
            data={data}
            loading={(list.isPending && !list.isError) || pastEnd || any.isLoading}
            onlyArchived={any.data === true}
            busy={list.isFetching}
            listSearch={location.search}
            onIncludeArchived={() => change({ archived: true })}
            onClearFilters={clearFilters}
            onPage={(page) => show({ ...view, page })}
          />
        </>
      )}
    </Stack>
  )
}

interface ListBodyProps {
  view: ListView
  data: ReturnType<typeof useStudentList>['data']
  loading: boolean
  onlyArchived: boolean
  busy: boolean
  listSearch: string
  onIncludeArchived: () => void
  onClearFilters: () => void
  onPage: (page: number) => void
}

function ListBody({
  view,
  data,
  loading,
  onlyArchived,
  busy,
  listSearch,
  onIncludeArchived,
  onClearFilters,
  onPage,
}: ListBodyProps) {
  const { t } = useTranslation('students')
  const listTop = useRef<HTMLDivElement>(null)
  if (loading) return <ListSkeleton />
  if (!data) return null
  if (data.totalItems === 0) {
    if (view.q) {
      return (
        <EmptyState
          icon={<SearchX />}
          title={t('list.filteredTitle', { q: view.q })}
          description={t('list.filteredDescription')}
          action={
            <Button variant="secondary" onPress={onClearFilters}>
              {t('list.clearFilters')}
            </Button>
          }
        />
      )
    }
    if (onlyArchived) {
      return (
        <EmptyState
          icon={<Archive />}
          title={t('list.noActiveTitle')}
          description={t('list.noActiveDescription')}
          action={
            <Button variant="secondary" onPress={onIncludeArchived}>
              {t('list.includeArchived')}
            </Button>
          }
        />
      )
    }
    return null
  }
  const columns: Array<DataListColumn<Column>> = [
    { id: 'name', header: t('list.columns.name') },
    { id: 'status', header: t('list.columns.status'), nowrap: true, inTitle: true },
    { id: 'email', header: t('list.columns.email') },
    { id: 'phone', header: t('list.columns.phone'), nowrap: true },
  ]
  const rows: DataListRow<Column>[] = data.items.map((student: StudentRow) => ({
    id: student.id,
    cells: {
      // The username as a muted second line of the name (AC12 (q)): no column of its own, so names and emails keep room.
      name: (
        <span className={styles.nameCell}>
          <Link to={`/tutor/students/${student.id}`} state={{ listSearch }} className={styles.nameLink}>
            {student.fullName}
          </Link>{' '}
          <span className={styles.username}>@{student.username}</span>
        </span>
      ),
      status: <StudentStatusBadge status={student.status} />,
      email: student.email,
      phone: student.phone,
    },
  }))
  return (
    <Stack gap={4}>
      <div ref={listTop} aria-busy={busy || undefined}>
        <DataList label={t('list.label')} columns={columns} rows={rows} />
      </div>
      {data.totalPages > 1 ? (
        <Pager page={view.page} pages={Math.max(data.totalPages, view.page)} listTop={listTop} onPage={onPage} />
      ) : null}
    </Stack>
  )
}

interface PagerProps {
  page: number
  pages: number
  listTop: RefObject<HTMLDivElement | null>
  onPage: (page: number) => void
}

/**
 * Previous / Next with "Page n of m" (T-M2.5 scope 2, AC12 (a)–(c)). After a page change from here, the list top
 * scrolls into view and the new position is announced politely; when the pressed button is now disabled (first or
 * last page), focus moves to the other one instead of dropping to the body (WCAG 2.4.3).
 */
function Pager({ page, pages, listTop, onPage }: PagerProps) {
  const { t } = useTranslation('students')
  const nav = useRef<HTMLElement>(null)
  const pressed = useRef(false)
  const [announcement, setAnnouncement] = useState('')
  const label = t('list.page', { page, pages })
  useEffect(() => {
    if (!pressed.current) return
    pressed.current = false
    const active = document.activeElement
    if (active === document.body || (active instanceof HTMLButtonElement && active.disabled)) {
      nav.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus({ preventScroll: true })
    }
    listTop.current?.scrollIntoView?.({ block: 'start' })
    setAnnouncement(label)
  }, [page, label, listTop])
  const go = (next: number) => {
    pressed.current = true
    onPage(next)
  }
  return (
    <nav ref={nav} aria-label={t('list.pagination')} className={styles.pagination}>
      <Button variant="secondary" isDisabled={page <= 1} onPress={() => go(page - 1)}>
        {t('list.previous')}
      </Button>
      <span className={styles.pageNumber}>{label}</span>
      <Button variant="secondary" isDisabled={page >= pages} onPress={() => go(page + 1)}>
        {t('list.next')}
      </Button>
      <output className={styles.visuallyHidden}>{announcement}</output>
    </nav>
  )
}

/** The rows' shape while the first page loads (shown after 150 ms; the region is busy and labelled at once). */
function ListSkeleton() {
  const { t } = useTranslation('students')
  return (
    <output aria-busy="true" aria-label={t('list.loading')} className={styles.skeletonRows}>
      <DelayedSkeleton>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} shape="block" inlineSize="100%" blockSize="var(--size-control-lg)" />
        ))}
      </DelayedSkeleton>
    </output>
  )
}

/**
 * The search box's text: typed freely, written to the URL 300 ms after the last keystroke (control characters removed,
 * trimmed), and replaced when the URL's `q` changes from elsewhere (Back, Clear filters).
 */
function useSearch(q: string, onSearch: (q: string) => void) {
  const [text, setText] = useState(q)
  const pushed = useRef(q)
  const latest = useRef(onSearch)
  useEffect(() => {
    latest.current = onSearch
  })
  useEffect(() => {
    if (q !== pushed.current) {
      pushed.current = q
      setText(q)
    }
  }, [q])
  useEffect(() => {
    const cleaned = cleanQuery(text)
    if (cleaned === pushed.current) return
    const timer = setTimeout(() => {
      pushed.current = cleaned
      latest.current(cleaned)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text])
  return {
    text,
    setText,
    reset: () => {
      pushed.current = ''
      setText('')
    },
  }
}
