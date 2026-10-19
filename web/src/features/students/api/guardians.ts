import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, type components } from '../../../lib/api'
import type { GuardianRequest, UpdateGuardianRequest } from '../model/guardianSchema'
import { isTutorSession } from './tutorSession'

export type Guardian = components['schemas']['GuardianResponse']

/** A student's guardians, in insertion order (T-M2.15 scope 1). */
export const guardianKeys = { list: (sid: string) => ['students', 'guardians', sid] as const }

/** `GET /tutor/students/{sid}/guardians`. */
export function useGuardians(sid: string) {
  return useQuery({
    queryKey: guardianKeys.list(sid),
    queryFn: async (): Promise<Guardian[]> =>
      (await api.GET('/api/v1/tutor/students/{sid}/guardians', { params: { path: { sid } } })).data!,
  })
}

/**
 * The guardians cache entry, changed in place by a write's answer (no refetch), and only while the tutor's session is
 * cached (scope 8). Guardian writes never touch the student's detail entry or `version`.
 */
function useUpdateCache(sid: string) {
  const queryClient = useQueryClient()
  return (change: (list: Guardian[]) => Guardian[]) => {
    if (!isTutorSession(queryClient)) return
    queryClient.setQueryData<Guardian[]>(guardianKeys.list(sid), (list) => (list ? change(list) : list))
  }
}

/** `POST …/guardians`: the answer is appended. */
export function useAddGuardian(sid: string) {
  const update = useUpdateCache(sid)
  return useMutation({
    mutationFn: async (body: GuardianRequest): Promise<Guardian> =>
      (await api.POST('/api/v1/tutor/students/{sid}/guardians', { params: { path: { sid } }, body })).data!,
    onSuccess: (guardian) => update((list) => [...list, guardian]),
  })
}

/** `PATCH /tutor/guardians/{gid}` with the guardian's `version`: the answer replaces it by `id`. */
export function useUpdateGuardian(sid: string) {
  const update = useUpdateCache(sid)
  return useMutation({
    mutationFn: async ({ gid, body }: { gid: string; body: UpdateGuardianRequest }): Promise<Guardian> =>
      (await api.PATCH('/api/v1/tutor/guardians/{gid}', { params: { path: { gid } }, body })).data!,
    onSuccess: (guardian) => update((list) => list.map((g) => (g.id === guardian.id ? guardian : g))),
  })
}

/**
 * `DELETE /tutor/guardians/{gid}`: the guardian leaves the cache entry. A 404 (removed elsewhere already) counts as done
 * (`'gone'`), and the guardians are refetched as well.
 */
export function useRemoveGuardian(sid: string) {
  const queryClient = useQueryClient()
  const update = useUpdateCache(sid)
  return useMutation({
    mutationFn: async (gid: string): Promise<'removed' | 'gone'> => {
      try {
        await api.DELETE('/api/v1/tutor/guardians/{gid}', { params: { path: { gid } } })
        return 'removed'
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return 'gone'
        throw error
      }
    },
    onSuccess: (result, gid) => {
      update((list) => list.filter((g) => g.id !== gid))
      if (result === 'gone' && isTutorSession(queryClient))
        void queryClient.invalidateQueries({ queryKey: guardianKeys.list(sid) })
    },
  })
}
