import type { ReactNode } from 'react'
import { useMinWidth } from './breakpoints'
import { cx } from './cx'
import styles from './DataList.module.css'

export interface DataListColumn<K extends string> {
  id: K
  /** The column header (table) and the visually hidden label of the value (list). */
  header: string
  /** Keep the value on one line in the table (short values such as a phone number or a status badge). */
  nowrap?: boolean
  /**
   * The table column's smallest width (a size token, e.g. `var(--size-column-id)`), so short unbreakable values such as
   * usernames stay on one line beside `nowrap` columns; longer values still wrap (T-M2.5 AC12 (p)).
   */
  minInlineSize?: string
  /** In the narrow list, show the value beside the title instead of on the meta line (e.g. a status badge). */
  inTitle?: boolean
}

export interface DataListRow<K extends string> {
  id: string
  /** One value per column; `null` leaves the cell empty (table) or omits the value (list). */
  cells: Record<K, ReactNode | null>
}

export interface DataListProps<K extends string> {
  /** The table's caption and the list's accessible name (visually hidden). */
  label: string
  /** The first column is the row's title (in the list: the first line). */
  columns: readonly DataListColumn<K>[]
  rows: readonly DataListRow<K>[]
}

/**
 * A responsive collection (design-system §3, responsive-standards §3.3): at ≥ 768 px (`md`) a semantic table with column
 * headers; below, a list of rows whose first column is the title and the others a wrapping meta line, each value led by
 * its visually hidden header. One DOM structure at a time (chosen with `useMinWidth`), so nothing is duplicated for
 * assistive technology. Long values wrap (`overflow-wrap: anywhere`): never a horizontal scroll at 360 px; a `nowrap`
 * column keeps short values on one line in the table, an `inTitle` column sits beside the list row's title (T-M2.5 AC12).
 */
export function DataList<K extends string>({ label, columns, rows }: DataListProps<K>) {
  const wide = useMinWidth('md')
  const [first, ...rest] = columns
  if (!first) return null
  if (wide) {
    return (
      <table className={styles.table}>
        <caption className={styles.visuallyHidden}>{label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={styles.header}
                style={column.minInlineSize ? { minInlineSize: column.minInlineSize } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={styles.row}>
              {columns.map((column, index) =>
                index === 0 ? (
                  <th key={column.id} scope="row" className={styles.cell}>
                    {row.cells[column.id]}
                  </th>
                ) : (
                  <td key={column.id} className={cx(styles.cell, column.nowrap && styles.nowrap)}>
                    {row.cells[column.id]}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
  return (
    <ul aria-label={label} className={styles.list}>
      {rows.map((row) => (
        <li key={row.id} className={styles.item}>
          <div className={styles.title}>
            {row.cells[first.id]}
            {rest
              .filter((column) => column.inTitle)
              .map((column) => (
                <span key={column.id} className={styles.titleValue}>
                  {row.cells[column.id]}
                </span>
              ))}
          </div>
          <div className={styles.meta}>
            {rest.map((column) =>
              column.inTitle || row.cells[column.id] === null ? null : (
                <span key={column.id} className={styles.metaValue}>
                  <span className={styles.visuallyHidden}>{`${column.header}: `}</span>
                  {row.cells[column.id]}
                </span>
              ),
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
