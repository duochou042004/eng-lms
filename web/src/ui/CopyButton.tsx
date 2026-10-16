import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, type ButtonVariant } from './Button'
import styles from './CopyButton.module.css'

export interface CopyButtonProps {
  /** The text put on the clipboard. */
  text: string
  /** The button's visible label (e.g. "Copy message"). */
  label: string
  /** A longer accessible name that contains the visible label (WCAG 2.5.3), e.g. "Copy Zalo". */
  accessibleLabel?: string
  /** Announced politely after a successful copy ("Copied"). */
  copiedMessage: string
  /** Shown (and announced) when the clipboard is unavailable or refused, e.g. "Couldn't copy. Select the text and copy it." */
  failedMessage: string
  variant?: ButtonVariant
}

type CopyState = 'idle' | 'copied' | 'failed'
const RESET_MS = 4000

/**
 * Copies a text with `navigator.clipboard.writeText` (design-system §3). The result goes into a polite status region
 * beside the button: "Copied" (and a check icon on the button for a few seconds), or, where the clipboard is unavailable
 * or the browser refuses, the manual-copy message, which stays until the next attempt (the text it refers to must stay
 * selectable on the page). States: as `Button`, plus copied and failed.
 */
export function CopyButton({
  text,
  label,
  accessibleLabel,
  copiedMessage,
  failedMessage,
  variant = 'secondary',
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle')
  useEffect(() => {
    if (state !== 'copied') return
    const timer = setTimeout(() => setState('idle'), RESET_MS)
    return () => clearTimeout(timer)
  }, [state])
  const copy = async () => {
    try {
      // `navigator.clipboard` is undefined outside a secure context: that throws here too.
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('failed')
    }
  }
  return (
    <span className={styles.copy}>
      <Button variant={variant} aria-label={accessibleLabel} onPress={() => void copy()}>
        {state === 'copied' ? (
          <Check aria-hidden="true" className={styles.icon} />
        ) : (
          <Copy aria-hidden="true" className={styles.icon} />
        )}
        {label}
      </Button>
      <output className={state === 'failed' ? styles.failed : styles.copied}>
        {state === 'copied' ? copiedMessage : state === 'failed' ? failedMessage : ''}
      </output>
    </span>
  )
}
