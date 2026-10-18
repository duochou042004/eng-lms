import { CircleCheck, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type RefObject } from 'react'
import {
  Text,
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as AriaToastContent,
  UNSTABLE_ToastRegion as AriaToastRegion,
} from 'react-aria-components'
import { Button } from './Button'
import { cx } from './cx'
import { IconButton } from './IconButton'
import styles from './Toast.module.css'

import { queue, TOAST_STACK_VAR } from './toastQueue'

// shortcut: React Aria's toast is UNSTABLE_-prefixed; see toastQueue.ts.

// The content's role: an announcement in a polite live region (React Aria's default is `alert`, interaction-states §4).
const POLITE = { role: 'status', 'aria-live': 'polite' } as const

export interface ToastRegionProps {
  /** The region's landmark name ("Notifications"). */
  label: string
  /** The Close button's name ("Dismiss"). */
  dismissLabel: string
}

/**
 * The one toast region of a shell: a `region` landmark (F6 reaches it, React Aria), each toast announced politely
 * (`role="status"`), at most 3 visible with the newest last. Placement (fixed, not content-driven): bottom centre
 * below 768 px with 16 px gutters, bottom end at ≥ 768 px with a 24rem width, above page content (`--z-toast`). While
 * it holds a toast it publishes its height as `--toast-stack-size` on `:root` (and `data-toasts`), so the shell keeps room below its
 * content (WCAG 2.2 SC 2.4.11). Unmounting it clears the queue (a sign-out never leaves a toast).
 */
export function ToastRegion({ label, dismissLabel }: ToastRegionProps) {
  const visible = useSyncExternalStore(
    (onChange) => queue.subscribe(onChange),
    () => queue.visibleToasts,
  )
  useEffect(() => () => queue.clear(), [])
  const regionRef = useRef<HTMLDivElement>(null)
  useStackSize(regionRef, visible.length > 0)
  return (
    // Remounted when it gets its first toast: React Aria registers the region as an F6 landmark in a layout effect that
    // re-runs only when its label changes, and an empty region has no element to register (a fixed label never changes).
    <AriaToastRegion
      key={visible.length > 0 ? 'shown' : 'empty'}
      queue={queue}
      aria-label={label}
      ref={regionRef}
      className={styles.region}
    >
      {/* Newest last: React Aria's queue lists the newest first. */}
      <ol className={styles.list}>
        {[...visible].reverse().map((item) => (
          <li key={item.key} className={styles.item}>
            <AriaToast toast={item} className={cx(styles.toast, item.content.action && styles.withAction)}>
              <CircleCheck aria-hidden="true" className={styles.icon} />
              <AriaToastContent {...POLITE} className={styles.content}>
                <Text slot="title" className={styles.message}>
                  {item.content.message}
                </Text>
              </AriaToastContent>
              {item.content.action ? (
                <div className={styles.action}>
                  <Button variant="secondary" onPress={item.content.action.onAction}>
                    {item.content.action.label}
                  </Button>
                </div>
              ) : null}
              <div className={styles.close}>
                <IconButton label={dismissLabel} icon={<X />} onPress={() => queue.close(item.key)} />
              </div>
            </AriaToast>
          </li>
        ))}
      </ol>
    </AriaToastRegion>
  )
}

/**
 * Keeps `--toast-stack-size` on `:root` equal to the region's height while it is shown, with `data-toasts` marking that
 * state (the shell's styles key on it); both are removed otherwise.
 */
function useStackSize(ref: RefObject<HTMLDivElement | null>, shown: boolean) {
  useLayoutEffect(() => {
    const root = document.documentElement
    const region = ref.current
    const remove = () => {
      root.style.removeProperty(TOAST_STACK_VAR)
      delete root.dataset.toasts
    }
    if (!shown || !region) return remove()
    const publish = () => root.style.setProperty(TOAST_STACK_VAR, `${region.getBoundingClientRect().height}px`)
    publish()
    root.dataset.toasts = ''
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish)
    observer?.observe(region)
    return () => {
      observer?.disconnect()
      remove()
    }
  }, [ref, shown])
}
