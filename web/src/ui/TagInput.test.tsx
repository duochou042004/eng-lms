import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { addTags } from './tagEntry'
import { TagInput, TagList } from './TagInput'
import { UiProvider } from './UiProvider'

// T-M2.17 AC2: the entry rules (Enter, typed comma, paste), refusals with the text kept, the limit, Enter never submits,
// the remove buttons' names and the focus after a removal; axe.

const LIMITS = { maxTags: 30, maxLength: 40 }
const MESSAGES = {
  remove: (tag: string) => `Xoá ${tag}`,
  control: 'Thẻ không được chứa ký tự điều khiển.',
  tooLong: 'Tối đa 40 ký tự.',
  duplicate: 'Đã có.',
  tooMany: 'Tối đa 30 thẻ.',
}

function Tags({ initial = [] as string[], onSubmit = () => {}, errorMessage = undefined as string | undefined }) {
  const [value, setValue] = useState(initial)
  const [text, setText] = useState('')
  return (
    <UiProvider locale="vi">
      <form
        aria-label="Mẫu"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <TagInput
          label="Điểm mạnh"
          hint="Nhấn Enter hoặc gõ dấu phẩy để thêm"
          id="tags"
          value={value}
          onChange={setValue}
          inputValue={text}
          onInputChange={setText}
          {...LIMITS}
          errorMessage={errorMessage}
          messages={MESSAGES}
        />
        <button type="submit">Lưu</button>
      </form>
    </UiProvider>
  )
}

const input = () => screen.getByRole('textbox', { name: 'Điểm mạnh' })
const group = () => screen.getByRole('group', { name: 'Điểm mạnh' })
const chips = () =>
  within(group())
    .queryAllByRole('listitem')
    .map((li) => li.textContent)

describe('addTags', () => {
  it.each([
    ['a, b\nc', [], ['a', 'b', 'c'], '', []],
    ['  ,\t, ', ['x'], ['x'], '', []],
    ['A', ['a'], ['a'], 'A', ['duplicate']],
    ['b, B', [], ['b'], 'B', ['duplicate']],
    ['x'.repeat(41), [], [], 'x'.repeat(41), ['tooLong']],
    ['😀'.repeat(40), [], ['😀'.repeat(40)], '', []],
    ['a\u0007b', [], [], 'a\u0007b', ['control']],
    ['a\u0085b', [], [], 'a\u0085b', ['control']],
    [
      'new, more',
      Array.from({ length: 29 }, (_, i) => `t${i}`),
      [...Array.from({ length: 29 }, (_, i) => `t${i}`), 'new'],
      'more',
      ['tooMany'],
    ],
    ['ok, x\u0001, dup, also', ['dup'], ['dup', 'ok', 'also'], 'x\u0001, dup', ['control', 'duplicate']],
    // T-M2.20 AC8: every distinct reason once, in the order of its first refusal.
    [
      `${'x'.repeat(41)}, new, more, ${'y'.repeat(41)}`,
      Array.from({ length: 29 }, (_, i) => `t${i}`),
      [...Array.from({ length: 29 }, (_, i) => `t${i}`), 'new'],
      `${'x'.repeat(41)}, more, ${'y'.repeat(41)}`,
      ['tooLong', 'tooMany'],
    ],
    ['Nghe, Đọc\nViết\tNGHE,  ,Bad\u0007x', [], ['Nghe', 'Đọc', 'Viết'], 'NGHE, Bad\u0007x', ['duplicate', 'control']],
  ])('%j onto %j → %j, rest %j, errors %j', (text, value, tags, rest, errors) => {
    expect(addTags(value, text, LIMITS)).toEqual({ value: tags, rest, errors })
  })
})

describe('TagInput', () => {
  it('is a group named by its label: chips in a list, the input under them with its hint (axe)', async () => {
    const { container } = render(<Tags initial={['Nghe', 'Nói']} />)
    expect(chips()).toEqual(['Nghe', 'Nói'])
    expect(input()).toHaveAccessibleDescription('Nhấn Enter hoặc gõ dấu phẩy để thêm')
    expect(input()).toHaveAttribute('id', 'tags')
    const buttons = within(group()).getAllByRole('button')
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Xoá Nghe', 'Xoá Nói'])
    // Exactly the given name, no extra description (no React Aria TagGroup, DEC-140 (4)).
    for (const b of buttons) expect(b).not.toHaveAttribute('aria-describedby')
    expect(buttons[0]).toHaveAccessibleName('Xoá Nghe')
    await expectNoAxeViolations(container)
  })

  it('adds on Enter (focus stays, input cleared) and on a typed comma; Enter never submits; an empty entry is ignored', async () => {
    const submit = vi.fn()
    render(<Tags onSubmit={submit} />)
    await userEvent.type(input(), 'Phát âm{Enter}')
    expect(chips()).toEqual(['Phát âm'])
    expect(input()).toHaveValue('')
    expect(input()).toHaveFocus()
    await userEvent.type(input(), 'Từ vựng,Ngữ')
    expect(chips()).toEqual(['Phát âm', 'Từ vựng'])
    expect(input()).toHaveValue('Ngữ')
    await userEvent.clear(input())
    await userEvent.type(input(), '   {Enter}')
    await userEvent.type(input(), '{Enter}')
    expect(chips()).toEqual(['Phát âm', 'Từ vựng'])
    expect(submit).not.toHaveBeenCalled()
  })

  it('splits a paste at commas, tabs and line breaks', async () => {
    render(<Tags />)
    await userEvent.click(input())
    await userEvent.paste('a, b\nc')
    expect(chips()).toEqual(['a', 'b', 'c'])
    expect(input()).toHaveValue('')
    await userEvent.paste('d\te, A, f')
    expect(chips()).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(input()).toHaveValue('A')
    expect(input()).toHaveAccessibleDescription(/Đã có\./)
  })

  it('a paste refused for two reasons shows both messages in its one error, joined by a space (T-M2.20 AC8)', async () => {
    render(<Tags />)
    await userEvent.click(input())
    await userEvent.paste('Nghe, Đọc\nViết\tNGHE,  ,Bad\u0007x')
    expect(chips()).toEqual(['Nghe', 'Đọc', 'Viết'])
    expect(input()).toHaveValue('NGHE, Bad\u0007x')
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(input()).toHaveAccessibleDescription(
      `Nhấn Enter hoặc gõ dấu phẩy để thêm ${MESSAGES.duplicate} ${MESSAGES.control}`,
    )
    expect(screen.getByText(`${MESSAGES.duplicate} ${MESSAGES.control}`)).toBeInTheDocument()
  })

  it("a new caller error wins over the last entry's reasons; a later refused commit shows its own again (T-M2.20 AC10)", async () => {
    const { rerender } = render(<Tags initial={['Nghe']} />)
    await userEvent.type(input(), 'NGHE{Enter}')
    expect(input()).toHaveAccessibleDescription(/Đã có\.$/)
    rerender(<Tags initial={['Nghe']} errorMessage="Lỗi của biểu mẫu." />)
    expect(input()).toHaveAccessibleDescription(/Lỗi của biểu mẫu\.$/)
    expect(screen.queryByText(MESSAGES.duplicate)).not.toBeInTheDocument()
    await userEvent.type(input(), '{Enter}')
    expect(input()).toHaveAccessibleDescription(/Đã có\.$/)
  })

  it.each([
    ['a 41-character tag', 'x'.repeat(41), MESSAGES.tooLong],
    ['a duplicate in other case', 'NGHE', MESSAGES.duplicate],
    ['a control character', 'a\u0007b', MESSAGES.control],
  ])('refuses %s: the text stays, the error shows, nothing is added', async (_, text, message) => {
    render(<Tags initial={['Nghe']} />)
    await userEvent.click(input())
    await userEvent.paste(text)
    await userEvent.keyboard('{Enter}')
    expect(chips()).toEqual(['Nghe'])
    expect(input()).toHaveValue(text)
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(message)).toBeInTheDocument()
    // Typing clears the entry's error.
    await userEvent.type(input(), 'z')
    expect(screen.queryByText(message)).not.toBeInTheDocument()
  })

  it('refuses the 31st tag; the input stays enabled at 30', async () => {
    const thirty = Array.from({ length: 30 }, (_, i) => `Thẻ ${i + 1}`)
    render(<Tags initial={thirty} />)
    expect(input()).toBeEnabled()
    await userEvent.type(input(), 'Thẻ 31{Enter}')
    expect(chips()).toHaveLength(30)
    expect(input()).toHaveValue('Thẻ 31')
    expect(screen.getByText(MESSAGES.tooMany)).toBeInTheDocument()
  })

  it('remove: focus to the next chip’s button, else the previous one’s, else the input', async () => {
    render(<Tags initial={['a', 'b', 'c']} />)
    await userEvent.click(screen.getByRole('button', { name: 'Xoá a' }))
    expect(chips()).toEqual(['b', 'c'])
    expect(screen.getByRole('button', { name: 'Xoá b' })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: 'Xoá c' }))
    expect(screen.getByRole('button', { name: 'Xoá b' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(chips()).toEqual([])
    expect(input()).toHaveFocus()
  })

  it('keyboard: Tab reaches each remove button, then the input', async () => {
    render(<Tags initial={['a', 'b']} />)
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Xoá a' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Xoá b' })).toHaveFocus()
    await userEvent.tab()
    expect(input()).toHaveFocus()
  })

  it('shows the caller’s error and the disabled state (axe)', async () => {
    const { container } = render(
      <UiProvider locale="vi">
        <TagInput
          label="Điểm yếu"
          value={['Nghe']}
          onChange={() => {}}
          inputValue=""
          onInputChange={() => {}}
          {...LIMITS}
          errorMessage="Tối đa 30 thẻ."
          messages={MESSAGES}
        />
        <TagInput
          label="Khoá"
          value={['Nói']}
          onChange={() => {}}
          inputValue=""
          onInputChange={() => {}}
          {...LIMITS}
          isDisabled
          messages={MESSAGES}
        />
      </UiProvider>,
    )
    expect(screen.getByRole('textbox', { name: 'Điểm yếu' })).toHaveAccessibleDescription('Tối đa 30 thẻ.')
    expect(screen.getByRole('textbox', { name: 'Khoá' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Xoá Nói' })).toBeDisabled()
    await expectNoAxeViolations(container)
  })

  it('TagList: read-only chips in a list, in order', async () => {
    const { container } = render(<TagList tags={['https://example.com', '<b>x</b>']} />)
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['https://example.com', '<b>x</b>'])
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    await expectNoAxeViolations(container)
  })
})
