import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ComboBox } from './ComboBox'
import { ConfirmDialog } from './ConfirmDialog'
import { Popover } from './Popover'
import { SearchField } from './SearchField'
import { Sheet } from './Sheet'
import { ToastRegion } from './Toast'
import { toast } from './toastQueue'
import { Toggletip } from './Toggletip'
import { UiProvider } from './UiProvider'

// T-M2.32 (f), AC5: React Aria's own strings follow the UI language (the dictionary of ui/ariaStrings, installed by the test
// setup as main.tsx does): the hidden dismiss buttons and the ComboBox announcements in vi, React Aria's English in en.
const noop = () => {}
const OVERLAYS: Record<string, () => ReactNode> = {
  Popover: () => (
    <Popover triggerLabel="Tài khoản" label="Tài khoản" isOpen onOpenChange={noop}>
      <p>nội dung</p>
    </Popover>
  ),
  Sheet: () => (
    <Sheet isOpen onOpenChange={noop} title="Menu" closeLabel="Đóng menu" placement="start">
      <p>nội dung</p>
    </Sheet>
  ),
  Toggletip: () => <Toggletip label="Gợi ý" message="Một gợi ý" icon={<span />} isOpen onOpenChange={noop} />,
}
const DISMISS = { vi: 'Đóng', en: 'Dismiss' } as const
const COUNT = { vi: 'Có 2 lựa chọn.', en: '2 options available.' } as const

function Zones() {
  const [value, setValue] = useState('')
  return (
    <ComboBox
      label="Múi giờ"
      options={[
        { id: 'Asia/Bangkok', label: 'Asia/Bangkok' },
        { id: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh' },
        { id: 'Europe/London', label: 'Europe/London' },
      ]}
      value={value}
      onChange={setValue}
      emptyMessage="Không có"
      buttonLabel="Hiện các múi giờ"
      listLabel="Các múi giờ"
    />
  )
}

/** The text of React Aria's live announcer (the ComboBox announcements). */
const announced = () => document.querySelector('[data-live-announcer]')?.textContent ?? ''

// jsdom has no layout: the ComboBox's virtualised list needs sizes (ui/ComboBox.test).
const sizes = { clientHeight: 440, clientWidth: 320, scrollHeight: 44, scrollWidth: 320 }
beforeEach(() => {
  for (const [name, value] of Object.entries(sizes))
    Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get: () => value })
})
afterEach(() => {
  for (const name of Object.keys(sizes)) delete (HTMLElement.prototype as unknown as Record<string, unknown>)[name]
})

describe('React Aria strings in vi and en', () => {
  for (const locale of ['vi', 'en'] as const) {
    for (const [name, overlay] of Object.entries(OVERLAYS))
      it(`${locale}: the hidden dismiss button of ${name} is named "${DISMISS[locale]}"`, async () => {
        render(<UiProvider locale={locale}>{overlay()}</UiProvider>)
        expect((await screen.findAllByRole('button', { name: DISMISS[locale] })).length).toBeGreaterThan(0)
        expect(screen.queryByRole('button', { name: DISMISS[locale === 'vi' ? 'en' : 'vi'] })).not.toBeInTheDocument()
      })

    it(`${locale}: the ComboBox count announcement is "${COUNT[locale]}"`, async () => {
      render(
        <UiProvider locale={locale}>
          <Zones />
        </UiProvider>,
      )
      await userEvent.type(screen.getByRole('combobox', { name: 'Múi giờ' }), 'asia')
      await waitFor(() => expect(announced()).toContain(COUNT[locale]))
    })

    it(`${locale}: SearchField (filled) and ConfirmDialog render without a throw`, async () => {
      render(
        <UiProvider locale={locale}>
          <SearchField label="Tìm" clearLabel="Xoá tìm kiếm" defaultValue="lan" />
          <ConfirmDialog
            isOpen
            title="Lưu trữ?"
            description="Mô tả"
            confirmLabel="Lưu trữ"
            cancelLabel="Huỷ"
            onConfirm={noop}
            onCancel={noop}
          />
        </UiProvider>,
      )
      expect(await screen.findByRole('alertdialog', { name: 'Lưu trữ?' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Xoá tìm kiếm', hidden: true })).toBeInTheDocument()
    })

    it(`${locale}: Toast renders a toast without a throw`, async () => {
      render(
        <UiProvider locale={locale}>
          <ToastRegion label="Thông báo" dismissLabel="Đóng thông báo" />
        </UiProvider>,
      )
      act(() => toast.success('Đã lưu'))
      expect(await screen.findByText('Đã lưu')).toBeInTheDocument()
      act(() => toast.clear())
    })
  }

  it('follows a vi → en → vi switch without a reload', async () => {
    const { rerender } = render(<UiProvider locale="vi">{OVERLAYS.Popover!()}</UiProvider>)
    expect((await screen.findAllByRole('button', { name: 'Đóng' })).length).toBeGreaterThan(0)
    rerender(<UiProvider locale="en">{OVERLAYS.Popover!()}</UiProvider>)
    expect((await screen.findAllByRole('button', { name: 'Dismiss' })).length).toBeGreaterThan(0)
    rerender(<UiProvider locale="vi">{OVERLAYS.Popover!()}</UiProvider>)
    expect((await screen.findAllByRole('button', { name: 'Đóng' })).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()
  })
})
