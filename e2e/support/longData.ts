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
  }
  const lengths = { fullName: 30, username: 28, email: 60, guardianName: 120, guardianRelationship: 30 }
  for (const [key, length] of Object.entries(lengths)) {
    const value = data[key as keyof typeof data]
    if ([...value].length !== length)
      throw new Error(`longData: ${key} is ${[...value].length} characters, not ${length}`)
  }
  if (data.fullName.split(' ').length !== 5) throw new Error('longData: the full name must have five words')
  return data
}
