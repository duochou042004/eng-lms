/** Why an entry was refused (the caller's message for each is a `TagInput` prop). */
export type TagEntryError = 'control' | 'tooLong' | 'duplicate' | 'tooMany'

export interface TagLimits {
  maxTags: number
  /** In code points (validation-rules). */
  maxLength: number
}

export interface TagEntry {
  /** The tags after the entry: the accepted ones appended in order. */
  value: string[]
  /** The refused entries, comma-joined (the text left in the input); `''` when all were accepted. */
  rest: string
  /** Each distinct refusal reason once, in the order of its first refusal; `[]` when all were accepted. */
  errors: TagEntryError[]
}

export const SEPARATORS = /[,\t\r\n]/
// Any control character (C0, DEL, C1), the server's rule; tab and line breaks are separators before this check.
const isControl = (char: string) => {
  const code = char.codePointAt(0)!
  return code <= 0x1f || (code >= 0x7f && code <= 0x9f)
}

/**
 * Adds the tags of `text` (split at commas, tabs and line breaks; each trimmed) to `value` under the entry rules
 * (design-system §3 `TagInput`): an empty entry is ignored; a control character, more than `maxLength` code points, a
 * tag already present ignoring case, or one past `maxTags` is refused. Pure: `TagInput` and a form's Save use it.
 */
export function addTags(value: readonly string[], text: string, { maxTags, maxLength }: TagLimits): TagEntry {
  const tags = [...value]
  const refused: string[] = []
  const errors: TagEntryError[] = []
  for (const part of text.split(SEPARATORS)) {
    const tag = part.trim()
    if (tag === '') continue
    const reason: TagEntryError | null = [...tag].some(isControl)
      ? 'control'
      : [...tag].length > maxLength
        ? 'tooLong'
        : tags.some((t) => t.toLowerCase() === tag.toLowerCase())
          ? 'duplicate'
          : tags.length >= maxTags
            ? 'tooMany'
            : null
    if (reason) {
      refused.push(tag)
      if (!errors.includes(reason)) errors.push(reason)
    } else tags.push(tag)
  }
  return { value: tags, rest: refused.join(', '), errors }
}
