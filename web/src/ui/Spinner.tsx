import styles from './Spinner.module.css'

/** Decorative progress indicator; the owning control carries the accessible state (e.g. `aria-busy`). */
export function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />
}
