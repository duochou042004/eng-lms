import type { components } from './schema'

export type ProblemCode = components['schemas']['ProblemCode']

/** A failed API call, mapped from RFC 9457 Problem Details (api-conventions §5). Never show `detail` to users. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ProblemCode | 'NETWORK_ERROR' | 'UNKNOWN'
  readonly requestId: string | null

  constructor(status: number, code: ApiError['code'], requestId: string | null) {
    super(`API error ${status} ${code}`)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

const PROBLEM_CODES: ReadonlySet<string> = new Set<ProblemCode>([
  'MALFORMED_REQUEST',
  'NOT_FOUND',
  'METHOD_NOT_ALLOWED',
  'UNSUPPORTED_MEDIA_TYPE',
  'NOT_ACCEPTABLE',
  'VALIDATION_FAILED',
  'INTERNAL_ERROR',
])

/** Builds an ApiError from a non-2xx response, reading the Problem Details body when there is one. */
export async function toApiError(response: Response): Promise<ApiError> {
  const headerId = response.headers.get('X-Request-Id')
  const isProblem = response.headers.get('Content-Type')?.includes('application/problem+json') ?? false
  if (!isProblem) {
    return new ApiError(response.status, 'UNKNOWN', headerId)
  }
  try {
    const body = (await response.clone().json()) as { code?: unknown; requestId?: unknown }
    const code = typeof body.code === 'string' && PROBLEM_CODES.has(body.code) ? (body.code as ProblemCode) : 'UNKNOWN'
    const requestId = typeof body.requestId === 'string' ? body.requestId : headerId
    return new ApiError(response.status, code, requestId)
  } catch {
    return new ApiError(response.status, 'UNKNOWN', headerId)
  }
}
