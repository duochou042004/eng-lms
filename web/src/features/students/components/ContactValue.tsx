import { Link, Mail, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CopyButton } from '../../../ui'
import { contactHref, type ContactKind } from '../model/contactHref'
import styles from './Students.module.css'

export interface ContactValueProps {
  kind: ContactKind
  value: string
  /** The contact's name: "Phone", "Email" or the handle's own label ("Zalo"). */
  label: string
  /** A decorative kind icon before a link (the header's quick links, AC12 (h)). */
  withIcon?: boolean
}

const ICONS = { phone: Phone, email: Mail, handle: Link }

/**
 * A contact value (FR-STU-07): a link only when `contactHref` allows one (`tel:`, `mailto:`, `https:`), its visible text
 * the value and its accessible name saying what it does; https links open in a new tab without an opener or referrer.
 * Every other value is plain, selectable text with a copy button (DEC-100 SEC S4-8).
 */
export function ContactValue({ kind, value, label, withIcon = false }: ContactValueProps) {
  const { t } = useTranslation('students')
  const href = contactHref(kind, value)
  if (href === null) {
    return (
      <span className={styles.contactText}>
        <span className={styles.value}>{value}</span>
        <CopyButton
          variant="quiet"
          text={value}
          label={t('workspace.copy')}
          accessibleLabel={t('workspace.copyLabel', { label })}
          copiedMessage={t('card.copied')}
          failedMessage={t('card.copyFailed')}
        />
      </span>
    )
  }
  const name =
    kind === 'phone'
      ? t('workspace.call', { value })
      : kind === 'email'
        ? t('workspace.emailTo', { value })
        : t('workspace.openLink', { label, value })
  const Icon = ICONS[kind]
  const content = (
    <>
      {withIcon ? <Icon aria-hidden="true" className={styles.icon} /> : null}
      {value}
    </>
  )
  return kind === 'handle' ? (
    <a href={href} aria-label={name} target="_blank" rel="noopener noreferrer" className={styles.link}>
      {content}
    </a>
  ) : (
    <a href={href} aria-label={name} className={styles.link}>
      {content}
    </a>
  )
}
