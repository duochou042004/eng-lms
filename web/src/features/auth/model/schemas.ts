import { z } from 'zod'

/**
 * Form schemas (frontend-architecture §2). Messages are `auth` i18n keys, translated where they are shown. The lengths
 * follow validation-rules.md (new password 10–128); the server stays authoritative (common list, ≠ username, ≠ current).
 */
// CSP script-src 'self' (security.md §5): Zod's compiled fast path probes `new Function`, which the CSP reports as a
// violation; the interpreted path is plenty for these small forms.
z.config({ jitless: true })

export const PASSWORD_MIN = 10
export const PASSWORD_MAX = 128

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'errors.usernameRequired'),
  password: z.string().min(1, 'errors.passwordRequired'),
  rememberMe: z.boolean(),
})
export type LoginValues = z.infer<typeof loginSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'errors.currentRequired'),
    newPassword: z
      .string()
      .min(1, 'errors.newRequired')
      .min(PASSWORD_MIN, 'errors.PASSWORD_TOO_SHORT')
      .max(PASSWORD_MAX, 'errors.PASSWORD_TOO_LONG'),
    confirmPassword: z.string().min(1, 'errors.confirmRequired'),
  })
  .refine((values) => values.confirmPassword === values.newPassword, {
    path: ['confirmPassword'],
    message: 'errors.confirmMismatch',
  })
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
