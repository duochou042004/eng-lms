import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type components } from '../../../lib/api'
import type { WorkspaceMeta } from './useMeta'

export type WorkspaceSettings = components['schemas']['SettingsResponse']
export type WorkspaceSettingsRequest = components['schemas']['SettingsRequest']

export const WORKSPACE_SETTINGS_KEY = ['settings', 'workspace'] as const

/**
 * `GET /tutor/settings` (FR-SET-01): read again on arrival; not on window focus, so a form being edited keeps the
 * version it was opened with (another tab's save then answers 409 and the conflict dialog offers the reload).
 */
export function useWorkspaceSettings() {
  return useQuery({
    queryKey: WORKSPACE_SETTINGS_KEY,
    queryFn: async (): Promise<WorkspaceSettings> => (await api.GET('/api/v1/tutor/settings')).data!,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
}

/**
 * `PATCH /tutor/settings`: on 200 the settings query holds the answer and the public metadata only its new
 * `displayName` (the shells show it at once). Sent also offline: it fails at once and never replays (T-M2.6 QA-3).
 */
export function useUpdateWorkspaceSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: WorkspaceSettingsRequest): Promise<WorkspaceSettings> =>
      (await api.PATCH('/api/v1/tutor/settings', { body })).data!,
    networkMode: 'always',
    onSuccess: (settings) => {
      queryClient.setQueryData(WORKSPACE_SETTINGS_KEY, settings)
      queryClient.setQueryData<WorkspaceMeta>(
        ['settings', 'meta'],
        (old) => old && { ...old, displayName: settings.displayName },
      )
    },
  })
}
