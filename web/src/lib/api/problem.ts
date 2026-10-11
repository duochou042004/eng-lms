import type { components } from './schema'

export type ProblemCode = components['schemas']['ProblemCode']

/** One entry of a 422 `errors[]` (api-conventions §5): the field path and its code. */
export interface FieldError {
  field: string
  code: ProblemCode | 'UNKNOWN'
}

/** A failed API call, mapped from RFC 9457 Problem Details (api-conventions §5). Never show `detail` to users. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ProblemCode | 'NETWORK_ERROR' | 'UNKNOWN'
  readonly requestId: string | null
  readonly fieldErrors: readonly FieldError[]
  /** Seconds from a `Retry-After` header (429 `RATE_LIMITED`), else null. */
  readonly retryAfterSeconds: number | null

  constructor(
    status: number,
    code: ApiError['code'],
    requestId: string | null,
    fieldErrors: readonly FieldError[] = [],
    retryAfterSeconds: number | null = null,
  ) {
    super(`API error ${status} ${code}`)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
    this.fieldErrors = fieldErrors
    this.retryAfterSeconds = retryAfterSeconds
  }
}

// A Record, so the compiler fails when the generated ProblemCode union gains a code that is not listed here.
const PROBLEM_CODES: Record<ProblemCode, true> = {
  MALFORMED_REQUEST: true,
  NOT_FOUND: true,
  METHOD_NOT_ALLOWED: true,
  UNSUPPORTED_MEDIA_TYPE: true,
  NOT_ACCEPTABLE: true,
  VALIDATION_FAILED: true,
  INTERNAL_ERROR: true,
  UNAUTHENTICATED: true,
  SESSION_EXPIRED: true,
  FORBIDDEN_ROLE: true,
  PASSWORD_CHANGE_REQUIRED: true,
  CSRF_INVALID: true,
  RATE_LIMITED: true,
  PASSWORD_TOO_SHORT: true,
  PASSWORD_TOO_LONG: true,
  PASSWORD_TOO_COMMON: true,
  PASSWORD_EQUALS_USERNAME: true,
  PASSWORD_UNCHANGED: true,
  CURRENT_PASSWORD_INCORRECT: true,
  USERNAME_TAKEN: true,
  STALE_VERSION: true,
  INVALID_STATE_TRANSITION: true,
  REQUIRED: true,
  TOO_LONG: true,
  TOO_MANY: true,
  INVALID_FORMAT: true,
  INVALID_VALUE: true,
  USERNAME_INVALID: true,
}

function toCode(value: unknown): ProblemCode | 'UNKNOWN' {
  return typeof value === 'string' && Object.hasOwn(PROBLEM_CODES, value) ? (value as ProblemCode) : 'UNKNOWN'
}

function toFieldErrors(value: unknown): FieldError[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry: unknown) => {
    const { field, code } = (entry ?? {}) as { field?: unknown; code?: unknown }
    return typeof field === 'string' ? [{ field, code: toCode(code) }] : []
  })
}

/** `Retry-After` in delay-seconds form (the API never sends the HTTP-date form). */
function retryAfter(response: Response): number | null {
  const value = Number(response.headers.get('Retry-After'))
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : null
}

/** Builds an ApiError from a non-2xx response, reading the Problem Details body when there is one. */
export async function toApiError(response: Response): Promise<ApiError> {
  const headerId = response.headers.get('X-Request-Id')
  const isProblem = response.headers.get('Content-Type')?.includes('application/problem+json') ?? false
  if (!isProblem) {
    return new ApiError(response.status, 'UNKNOWN', headerId, [], retryAfter(response))
  }
  try {
    const body = (await response.clone().json()) as { code?: unknown; requestId?: unknown; errors?: unknown }
    const requestId = typeof body.requestId === 'string' ? body.requestId : headerId
    return new ApiError(response.status, toCode(body.code), requestId, toFieldErrors(body.errors), retryAfter(response))
  } catch {
    return new ApiError(response.status, 'UNKNOWN', headerId, [], retryAfter(response))
  }
}
