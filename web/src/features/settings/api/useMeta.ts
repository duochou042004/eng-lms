import { useQuery } from '@tanstack/react-query'
import { api, type components } from '../../../lib/api'

export type WorkspaceMeta = components['schemas']['MetaResponse']

/** Public workspace metadata (`GET /api/v1/meta`). */
export function useMeta() {
  return useQuery({
    queryKey: ['settings', 'meta'],
    queryFn: async (): Promise<WorkspaceMeta> => {
      const { data } = await api.GET('/api/v1/meta')
      return data as WorkspaceMeta
    },
    staleTime: 5 * 60_000,
  })
}
