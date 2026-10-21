/** `n` code points of the phrase repeated (real words; never ending on a space). */
function words(phrase: string, n: number) {
  const text = [...`${phrase} `.repeat(Math.ceil(n / phrase.length) + 1)].slice(0, n)
  if (text[n - 1] === ' ') text[n - 1] = '.'
  return text.join('')
}

/**
 * Realistic long values for the long-data walk (T-M2.19 scope 2; responsive-standards §3 items 1 and 8). Fictitious:
 * invented Vietnamese names, `example.com` addresses. `token` (6 characters, unique per run: the dev database is kept)
 * makes the student findable by the list search.
 */
export function longData(token: string) {
  const data = {
    /** 30 characters, five words. */
    fullName: `Nguyễn Thị Phương Thanh ${token}`,
    /** 28 characters. */
    username: `e2e-long-${token}`.padEnd(28, 'x'),
    /** 60 characters. */
    email: `nguyen.thi.phuong.thanh.${token}`.padEnd(48, 'x') + '@example.com',
    /** 120 characters of Vietnamese words. */
    guardianName:
      'Trần Thị Hoàng Bảo Ngọc Phương Lan Khê Diệp Minh Châu Thanh Hương Nguyễn Văn Quốc Trung Hiếu Nghĩa Đức Thịnh Phúc Lộc Ân',
    /** 30 characters. */
    guardianRelationship: 'Bà ngoại bên mẹ, người đưa đón',
    /** The learning profile (T-M2.17): a 40-character level. */
    learningLevel: words('Trung cấp giao tiếp, cần luyện thêm phát âm', 40),
    /** Three 30-character tags of words (distinct, no comma). */
    tags: [
      words('Phát âm các âm cuối trong câu dài', 30),
      words('Nghe hiểu hội thoại tốc độ nhanh', 30),
      words('Viết đoạn văn mô tả biểu đồ số liệu', 30),
    ],
    /** A 60-character custom field label. */
    fieldLabel: words('Mục tiêu điểm số cho kỳ kiểm tra cuối học kỳ hai của năm học', 60),
    /** A 500-character custom field value. */
    fieldValue: words('Đạt mức khá trong bài kiểm tra cuối kỳ, tự tin trình bày ý kiến cá nhân bằng tiếng Anh', 500),
    /** A 2,000-character learning note of real words with line breaks. */
    learningNotes: words(
      'Học viên chăm chỉ, làm bài tập về nhà đầy đủ nhưng còn ngại nói trước lớp.\nCần luyện nghe mỗi ngày mười lăm phút',
      2000,
    ),
  }
  const lengths = {
    fullName: 30,
    username: 28,
    email: 60,
    guardianName: 120,
    guardianRelationship: 30,
    learningLevel: 40,
    fieldLabel: 60,
    fieldValue: 500,
    learningNotes: 2000,
  }
  for (const tag of data.tags)
    if ([...tag].length !== 30) throw new Error(`longData: a tag is ${[...tag].length} characters, not 30`)
  for (const [key, length] of Object.entries(lengths)) {
    const value = data[key as keyof typeof data]
    if ([...value].length !== length)
      throw new Error(`longData: ${key} is ${[...value].length} characters, not ${length}`)
  }
  if (data.fullName.split(' ').length !== 5) throw new Error('longData: the full name must have five words')
  return data
}
