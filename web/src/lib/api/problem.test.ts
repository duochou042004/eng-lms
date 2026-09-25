import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { problem, server } from '../../test/server'
import { api } from './client'
import { ApiError } from './problem'

async function callMeta() {
  try {
    await api.GET('/api/v1/meta')
  } catch (error) {
    return error
  }
  throw new Error('expected a failure')
}

describe('API client error mapping (api-conventions §5)', () => {
  it('maps Problem Details to ApiError with code and requestId', async () => {
    server.use(http.get('*/api/v1/meta', () => problem(404, 'NOT_FOUND', 'abc-123')))
    const error = await callMeta()
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND', requestId: 'abc-123' })
  })

  it('maps an unknown code to UNKNOWN', async () => {
    server.use(http.get('*/api/v1/meta', () => problem(500, 'SOMETHING_NEW')))
    expect(await callMeta()).toMatchObject({ status: 500, code: 'UNKNOWN', requestId: 'req-test-1' })
  })

  it('maps a non-problem error body to UNKNOWN, keeping the header request ID', async () => {
    server.use(
      http.get('*/api/v1/meta', () => new HttpResponse('oops', { status: 502, headers: { 'X-Request-Id': 'hdr-1' } })),
    )
    expect(await callMeta()).toMatchObject({ status: 502, code: 'UNKNOWN', requestId: 'hdr-1' })
  })

  it('maps a network failure to NETWORK_ERROR', async () => {
    server.use(http.get('*/api/v1/meta', () => HttpResponse.error()))
    expect(await callMeta()).toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
  })

  it('returns typed data on success', async () => {
    const { data } = await api.GET('/api/v1/meta')
    expect(data?.locales).toEqual(['vi', 'en'])
  })
})
