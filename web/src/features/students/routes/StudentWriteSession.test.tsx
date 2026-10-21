import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { toast } from '../../../ui'
import { renderRoute } from '../../../test/render'
import { server, sessionBody } from '../../../test/server'
import { guardian, learningProfile, SID, student, workspaceApi } from '../../../test/students'

// T-M2.15 AC8 (scope 8, DEC-127): a students write answered after a sign-out and the next sign-in as a student, or while
// no tutor session is cached, stores nothing in the query cache, invalidates nothing and toasts nothing.

const LAN = guardian(1, { name: 'Nguyễn Thị Lan' })
type Method = 'post' | 'patch' | 'put' | 'delete'

/** Holds the next `method path` request until `release()`; resolves `reached` when it arrives. */
function hold(method: Method, path: string, answer: () => Response) {
  let release = () => {}
  let reached = () => {}
  const arrived = new Promise<void>((resolve) => (reached = resolve))
  server.use(
    http[method](path, async () => {
      reached()
      await new Promise<void>((resolve) => (release = resolve))
      return answer()
    }),
  )
  return { arrived, release: () => release() }
}

const WRITES: Array<{
  name: string
  hold: () => ReturnType<typeof hold>
  start: () => Promise<void>
}> = [
  {
    name: 'profile save',
    hold: () =>
      hold('patch', '*/api/v1/tutor/students/:sid', () => HttpResponse.json(student({ note: 'Mới', version: 1 }))),
    start: async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Sửa hồ sơ' }))
      await userEvent.type(await screen.findByRole('textbox', { name: 'Ghi chú' }), '!')
      await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    },
  },
  {
    name: 'status change',
    hold: () =>
      hold('post', '*/api/v1/tutor/students/:sid/status', () =>
        HttpResponse.json(student({ status: 'PAUSED', version: 1 })),
      ),
    start: () => userEvent.click(screen.getByRole('button', { name: 'Tạm nghỉ' })),
  },
  {
    name: 'guardian add',
    hold: () =>
      hold('post', '*/api/v1/tutor/students/:sid/guardians', () =>
        HttpResponse.json(guardian(2, { name: 'Trần Văn Ba' }), { status: 201 }),
      ),
    start: async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Thêm phụ huynh' }))
      await userEvent.type(screen.getByRole('textbox', { name: 'Tên (bắt buộc)' }), 'Trần Văn Ba')
      await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    },
  },
  {
    name: 'guardian edit',
    hold: () =>
      hold('patch', '*/api/v1/tutor/guardians/:gid', () =>
        HttpResponse.json({ ...LAN, relationship: 'Bà', version: 1 }),
      ),
    start: async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Sửa Nguyễn Thị Lan' }))
      await userEvent.clear(screen.getByRole('textbox', { name: 'Quan hệ' }))
      await userEvent.type(screen.getByRole('textbox', { name: 'Quan hệ' }), 'Bà')
      await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    },
  },
  {
    name: 'guardian remove',
    hold: () => hold('delete', '*/api/v1/tutor/guardians/:gid', () => new HttpResponse(null, { status: 204 })),
    start: async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Xoá Nguyễn Thị Lan' }))
      const dialog = await screen.findByRole('alertdialog', { name: /^Xoá Nguyễn Thị Lan/ })
      await userEvent.click(within(dialog).getByRole('button', { name: 'Xoá phụ huynh' }))
    },
  },
  {
    // T-M2.17 AC7 (scope 7): the learning profile's save.
    name: 'learning profile save',
    hold: () =>
      hold('put', '*/api/v1/tutor/students/:sid/learning-profile', () =>
        HttpResponse.json(learningProfile({ currentLevel: 'SECRET-LEVEL', version: 0 })),
      ),
    start: async () => {
      await userEvent.click(await screen.findByRole('button', { name: 'Sửa hồ sơ học tập' }))
      await userEvent.type(await screen.findByRole('textbox', { name: 'Trình độ hiện tại' }), 'SECRET-LEVEL')
      await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    },
  },
]

describe('A write answered after the tutor session ended (AC8)', { timeout: 20_000 }, () => {
  it.each(
    WRITES.flatMap((write) => [
      { ...write, after: 'sign-out and sign-in as a student', session: sessionBody('STUDENT') },
      { ...write, after: 'no session cached', session: null },
    ]),
  )('$name, answered after $after: nothing stored, invalidated or toasted', async (write) => {
    workspaceApi({}, { guardians: [LAN] })
    const { queryClient, unmount } = renderRoute(`/tutor/students/${SID}`)
    await screen.findByRole('heading', { level: 1, name: 'Nguyễn Văn An' })
    await screen.findByRole('heading', { level: 3, name: 'Nguyễn Thị Lan' })
    const held = write.hold()
    await write.start()
    await held.arrived
    const success = vi.spyOn(toast, 'success')
    // The sign-out clears the query cache and leaves the page; a sign-in keeps only the new session (useLogout, useLogin).
    unmount()
    queryClient.clear()
    if (write.session !== null) queryClient.setQueryData(['auth', 'session'], write.session)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    held.release()
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(queryClient.getQueryCache().findAll({ queryKey: ['students'] })).toEqual([])
    expect(invalidate).not.toHaveBeenCalled()
    expect(success).not.toHaveBeenCalled()
    success.mockRestore()
  })

  it('with the tutor session still cached, the same answer is stored (control)', async () => {
    const api = workspaceApi({}, { guardians: [LAN] })
    const { queryClient } = renderRoute(`/tutor/students/${SID}`)
    await screen.findByRole('heading', { level: 3, name: 'Nguyễn Thị Lan' })
    await userEvent.click(screen.getByRole('button', { name: 'Thêm phụ huynh' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Tên (bắt buộc)' }), 'Trần Văn Ba')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    await waitFor(() =>
      expect(
        queryClient.getQueryData<Array<{ name: string }>>(['students', 'guardians', SID])?.map((g) => g.name),
      ).toEqual(['Nguyễn Thị Lan', 'Trần Văn Ba']),
    )
    expect(api.calls.guardianPost).toHaveLength(1)
  })
})
