import type { TFunction } from 'i18next'
import { formatDateTime } from '../../../lib/time'

export interface CredentialsMessageInput {
  workspace: string
  loginUrl: string
  username: string
  temporaryPassword: string
  expiresAt: string
}

/**
 * The ready-to-paste message of the credentials card (T-M2.5 scope 5): one `students` string with interpolation, in the
 * UI language (`t` is bound to it), plain text; a neutral greeting without the name (AC12 (f)). Built only when copied; never stored.
 */
export function credentialsMessage(t: TFunction<'students'>, locale: string, input: CredentialsMessageInput) {
  return t('card.message', {
    workspace: input.workspace,
    url: input.loginUrl,
    username: input.username,
    password: input.temporaryPassword,
    expiry: formatDateTime(input.expiresAt, locale),
  })
}
