import { useQuery } from '@tanstack/react-query'
import { api, type components } from '../../../lib/api'

export type StudentAccount = components['schemas']['StudentAccountResponse']

/**
 * `GET /api/v1/student/account` (FR-SET-02, T-M2.7): the signed-in student's own full name and username (ADR-0016: no
 * id, the server reads the session). Its own module, so the student's Home and Account pages load none of the tutor's
 * Students code. Read again on window focus (TanStack defaults): a rename by the tutor shows at the next read.
 */
export function useStudentAccount() {
  return useQuery({
    queryKey: ['students', 'account'],
    queryFn: async (): Promise<StudentAccount> => {
      const { data } = await api.GET('/api/v1/student/account')
      return data as StudentAccount
    },
  })
}
