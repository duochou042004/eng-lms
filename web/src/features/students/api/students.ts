import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type components } from '../../../lib/api'
import { ALL_STATUSES, toListQuery, type ListView } from '../model/listParams'
import type { UpdateStudentRequest } from '../model/editSchema'
import type { CreateStudentRequest } from '../model/guardianSchema'
import { isTutorSession } from './tutorSession'

export type StudentRow = components['schemas']['StudentRow']
export type Student = components['schemas']['StudentResponse']
export type StudentPage = components['schemas']['PageResponseStudentRow']
export type CreatedStudent = components['schemas']['CreatedStudentResponse']
export type Credentials = components['schemas']['CredentialsResponse']
export type StudentStatusValue = Student['status']

/** Query keys (frontend-architecture §2: `[feature, resource, params]`). */
export const studentKeys = {
  list: ['students', 'list'] as const,
  detail: (sid: string) => ['students', 'detail', sid] as const,
}

/**
 * `GET /tutor/students` for a list view. The previous page stays on screen while the next one loads (a refetch keeps
 * the rows, interaction-states §1).
 */
export function useStudentList(view: ListView) {
  const query = toListQuery(view)
  return useQuery({
    queryKey: [...studentKeys.list, query],
    queryFn: async (): Promise<StudentPage> => (await api.GET('/api/v1/tutor/students', { params: { query } })).data!,
    placeholderData: keepPreviousData,
  })
}

/**
 * Whether the tutor has any student in any status (T-M2.5 scope 3): one `size=1` request with all three statuses, only
 * when the default view is empty, to tell first use from "only archived students".
 */
export function useAnyStudent(enabled: boolean) {
  const query = { status: [...ALL_STATUSES], page: 0, size: 1 }
  return useQuery({
    queryKey: [...studentKeys.list, query],
    queryFn: async () => (await api.GET('/api/v1/tutor/students', { params: { query } })).data!.totalItems > 0,
    enabled,
  })
}

/** `GET /tutor/students/{sid}`; `enabled` is false for a `sid` that is not a UUID (no request, T-M2.5 scope 6). */
export function useStudent(sid: string, enabled: boolean) {
  return useQuery({
    queryKey: studentKeys.detail(sid),
    queryFn: async (): Promise<Student> =>
      (await api.GET('/api/v1/tutor/students/{sid}', { params: { path: { sid } } })).data!,
    enabled,
  })
}

/** `GET /tutor/usernames/suggestion` for a full name (the caller decides when it is worth asking). */
export function useUsernameSuggestion(fullName: string, enabled: boolean) {
  return useQuery({
    queryKey: ['students', 'username-suggestion', fullName],
    queryFn: async () =>
      (await api.GET('/api/v1/tutor/usernames/suggestion', { params: { query: { fullName } } })).data!.username,
    enabled,
    retry: false,
  })
}

/** `GET /tutor/usernames/availability`: `{available, reason}` for the username as typed (never cached for long). */
export function useUsernameAvailability(username: string, enabled: boolean) {
  return useQuery({
    queryKey: ['students', 'username-availability', username],
    queryFn: async () =>
      (await api.GET('/api/v1/tutor/usernames/availability', { params: { query: { username } } })).data!,
    enabled,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  })
}

/**
 * `POST /tutor/students`. The answer holds the one-time temporary password (security.md T12): the caller moves it into
 * its component state and resets the mutation, and `gcTime: 0` drops the finished mutation (its variables and data)
 * from the cache at once; nothing is seeded into a query. The list is invalidated.
 */
export function useCreateStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateStudentRequest): Promise<CreatedStudent> =>
      (await api.POST('/api/v1/tutor/students', { body })).data!,
    gcTime: 0,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentKeys.list }),
  })
}

/**
 * A write's answer is the latest student (T-M2.14 "version bookkeeping"): it replaces the detail entry, so the next write
 * sends its `version` (never `+1`: a username-only PATCH keeps it), and the list is invalidated. Only while the tutor's
 * session is cached (scope 8): an answer that outlived the session is dropped.
 */
function useStoreStudent(sid: string) {
  const queryClient = useQueryClient()
  return (student: Student) => {
    if (!isTutorSession(queryClient)) return
    queryClient.setQueryData(studentKeys.detail(sid), student)
    void queryClient.invalidateQueries({ queryKey: studentKeys.list })
  }
}

/** `PATCH /tutor/students/{sid}` with `version` and the changed fields (FR-STU-03). */
export function useUpdateStudent(sid: string) {
  const store = useStoreStudent(sid)
  return useMutation({
    mutationFn: async (body: UpdateStudentRequest): Promise<Student> =>
      (await api.PATCH('/api/v1/tutor/students/{sid}', { params: { path: { sid } }, body })).data!,
    onSuccess: store,
  })
}

/** `POST /tutor/students/{sid}/status` `{status, version}` (FR-STU-05); no confirmation, the caller sends the latest version. */
export function useChangeStatus(sid: string) {
  const store = useStoreStudent(sid)
  return useMutation({
    mutationFn: async (body: { status: StudentStatusValue; version: number }): Promise<Student> =>
      (await api.POST('/api/v1/tutor/students/{sid}/status', { params: { path: { sid } }, body })).data!,
    onSuccess: store,
  })
}

/**
 * `POST /tutor/students/{sid}/password-reset` (FR-AUTH-07, security.md T12): the answer holds the one-time temporary
 * password. As `useCreateStudent`: `gcTime: 0`, nothing seeded into a query; the caller moves the answer into its
 * component state and resets the mutation.
 */
export function useResetPassword(sid: string) {
  return useMutation({
    mutationFn: async (): Promise<Credentials> =>
      (await api.POST('/api/v1/tutor/students/{sid}/password-reset', { params: { path: { sid } } })).data!,
    gcTime: 0,
  })
}

/**
 * The workspace name for the credentials message, from `GET /api/v1/meta` under the settings feature's key (the cache
 * entry the shell already holds; features do not import each other, frontend-architecture §1).
 */
export function useWorkspaceDisplayName() {
  return useQuery({
    queryKey: ['settings', 'meta'],
    queryFn: async () => (await api.GET('/api/v1/meta')).data!,
    staleTime: 5 * 60_000,
    select: (meta) => meta.displayName,
  })
}
