import { useEffect, useId, type ReactNode } from 'react'
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components'
import { Link, type LinkProps } from 'react-router'
import { cx } from './cx'
import styles from './Button.module.css'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'
export type ButtonSize = 'md' | 'lg'

export interface ButtonProps extends Omit<AriaButtonProps, 'className' | 'children' | 'style'> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

/**
 * React Aria announces a focused button's pending state through its live announcer with an entry that points at the
 * button by id (`aria-labelledby`), kept for 7 s. When the button goes away first (a submit that navigates or swaps
 * the form for its result), the entry points at nothing: unreadable, and an axe `role-img-alt` violation. Drop it.
 */
function isEntryFor(node: Node, id: string) {
  return (
    node instanceof Element &&
    node.closest('[data-live-announcer]') !== null &&
    node.getAttribute('aria-labelledby')?.split(' ')[0] === id
  )
}

function dropAnnouncementsFor(id: string) {
  for (const entry of document.querySelectorAll('[data-live-announcer] [aria-labelledby]')) {
    if (isEntryFor(entry, id)) entry.remove()
  }
}

/**
 * React Aria adds its very first announcement 100 ms late (while it creates the announcer), so the entry can arrive
 * after the button is gone. For that window a gone button watches the document and removes a late entry in the task
 * that inserts it (observer callbacks run as microtasks), so no other task (a screen reader, axe) ever sees it dangle
 * (T-M2.14 CI: axe caught one in the 50 ms a timer-based drop left open). The window ends after React Aria's delay;
 * its timer was set earlier than ours, so it fires first.
 * shortcut: relies on React Aria's announcer DOM (`[data-live-announcer]`) and its 100 ms first-announcement delay;
 * use its `clearAnnouncer` if RAC exports it.
 */
const LATE_ANNOUNCEMENT_WINDOW_MS = 500

function dropLateAnnouncementsFor(id: string) {
  if (typeof MutationObserver === 'undefined') return
  const observer = new MutationObserver((records) => {
    for (const record of records)
      for (const node of record.addedNodes) if (isEntryFor(node, id)) (node as Element).remove()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  setTimeout(() => observer.disconnect(), LATE_ANNOUNCEMENT_WINDOW_MS)
}

/** Actions (design-system §3). States: hover, focus-visible, pressed, disabled, pending (`isPending`). */
export function Button({ variant = 'primary', size = 'md', children, id, ...props }: ButtonProps) {
  const fallbackId = useId()
  const buttonId = id ?? fallbackId
  useEffect(
    () => () => {
      dropAnnouncementsFor(buttonId)
      dropLateAnnouncementsFor(buttonId)
    },
    [buttonId],
  )
  return (
    <AriaButton {...props} id={buttonId} className={cx(styles.button, styles[variant], styles[size])}>
      {props.isPending ? <Spinner /> : null}
      <span className={styles.label}>{children}</span>
    </AriaButton>
  )
}

export interface ButtonLinkProps extends Omit<LinkProps, 'className' | 'style'> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

/**
 * A router link that looks like a `Button` of the same variant and size (T-M2.11): a navigation keeps link semantics
 * (role `link`, opens in a new tab, no pending state) while sitting next to buttons in the same visual kind, e.g.
 * "Change password" beside "Log out". States: hover, active, focus-visible.
 */
export function ButtonLink({ variant = 'primary', size = 'md', children, ...props }: ButtonLinkProps) {
  return (
    <Link {...props} className={cx(styles.button, styles.link, styles[variant], styles[size])}>
      <span className={styles.label}>{children}</span>
    </Link>
  )
}
