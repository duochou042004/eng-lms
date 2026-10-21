import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type components } from '../../../lib/api'
import { isTutorSession } from './tutorSession'

export type LearningProfile = components['schemas']['LearningProfileResponse']
export type LearningProfileRequest = components['schemas']['LearningProfileRequest']

/** The student's learning profile (T-M2.17 scope 1); tutor-private (A-008), so a `students` key (cleared on sign-out). */
export const learningProfileKeys = { detail: (sid: string) => ['students', 'learningProfile', sid] as const }

/** `GET /tutor/students/{sid}/learning-profile` (a never-saved profile has `version` `null`). */
export function useLearningProfile(sid: string) {
  return useQuery({
    queryKey: learningProfileKeys.detail(sid),
    queryFn: async (): Promise<LearningProfile> =>
      (await api.GET('/api/v1/tutor/students/{sid}/learning-profile', { params: { path: { sid } } })).data!,
  })
}

/**
 * `PUT …/learning-profile` (the whole profile with the cached `version`): the answer replaces the cache entry (no
 * refetch), only while the tutor's session is cached (scope 7, DEC-127). It never touches the student's entry.
 */
export function useSaveLearningProfile(sid: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: LearningProfileRequest): Promise<LearningProfile> =>
      (await api.PUT('/api/v1/tutor/students/{sid}/learning-profile', { params: { path: { sid } }, body })).data!,
    onSuccess: (profile) => {
      if (isTutorSession(queryClient)) queryClient.setQueryData(learningProfileKeys.detail(sid), profile)
    },
  })
}
