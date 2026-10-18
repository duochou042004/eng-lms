import { useWatch, type Control } from 'react-hook-form'
import { useUsernameAvailability } from '../api/students'
import type { EditStudentValues } from '../model/editSchema'
import { DEBOUNCE_MS } from '../model/studentFields'
import { useDebounced } from '../model/useDebounced'

export type Availability = 'checking' | 'available' | 'taken' | 'invalid' | null

/**
 * The availability of the username as typed (debounced 300 ms, T-M2.5 scope 4): an answer counts only for the username
 * currently typed. `unchanged` (the student's own username in edit mode) is not checked and shows nothing; nor does a
 * username with a server error on it.
 */
export function useUsernameCheck<T extends EditStudentValues>(
  control: Control<T>,
  hasServerError: boolean,
  unchanged?: string,
) {
  const username = useWatch({ control: control as unknown as Control<EditStudentValues>, name: 'username' }).trim()
  const checkFor = useDebounced(username, DEBOUNCE_MS)
  const skip = (value: string) => value === '' || value === unchanged
  const availability = useUsernameAvailability(checkFor, !skip(checkFor))
  const state: Availability =
    skip(username) || hasServerError
      ? null
      : checkFor !== username || availability.isPending
        ? 'checking'
        : availability.isError
          ? null
          : availability.data.available
            ? 'available'
            : availability.data.reason === 'TAKEN'
              ? 'taken'
              : 'invalid'
  return { state, refetch: () => void availability.refetch() }
}
