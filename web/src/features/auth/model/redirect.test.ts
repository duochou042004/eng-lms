import { describe, expect, it } from 'vitest'
import { changePasswordPath, isSafeAppPath, loginPath, roleHome, safeNext } from './redirect'

// security.md T18, T-M2.4 design notes: the exact table, plus the extra cases the rules imply.
const ACCEPTED = [
  '/tutor',
  '/tutor/students?q=an',
  '/student/work#top',
  '/student',
  '/tutor?x=1',
  '/tutor/students?q=an%20b',
]
const REFUSED: Array<[string, string]> = [
  ['//evil.example', 'protocol-relative'],
  ['/\\evil', 'backslash after the slash'],
  ['https://evil.example', 'absolute URL'],
  ['javascript:alert(1)', 'script scheme'],
  ['/%2F%2Fevil', 'encoded protocol-relative'],
  ['%2F%2Fevil', 'fully encoded protocol-relative'],
  ['/%E0%A4%A', 'bad percent-encoding'],
  ['/tutor/../student/home', 'dot-dot segment'],
  ['/tutor/%2e%2e/x', 'encoded dot-dot segment'],
  ['/tutorx', 'namespace prefix only'],
  ['/login', 'not an app namespace'],
  ['/', 'root'],
  ['', 'empty'],
  ['/tutor/\u0000x', 'NUL'],
  ['/tutor/\nx', 'line feed'],
  ['/tutor/%0d%0ax', 'encoded CR LF'],
  ['/tutor/\u007fx', 'DEL'],
  ['/tutor/./x', 'dot segment'],
  ['/tutor/%2E/x', 'encoded dot segment (upper case)'],
  ['/tutor/%252e%252e/x', 'double-encoded dot-dot (raw %2e after one decode)'],
  ['/tutor/a\\b', 'backslash'],
  ['/tutor/%5Cb', 'encoded backslash'],
  ['/tutor/http://evil.example', 'scheme in the path'],
  ['/%74utor/../x', 'dot-dot after an encoded namespace'],
  ['/tutor/.. ', 'dot-dot with a trailing space (G3 SEC S4-4)'],
  ['/tutor/%2e%2e%20', 'encoded dot-dot and space (G3 SEC S4-4)'],
  ['/tutor/students/a%20b', 'whitespace in the path'],
  ['/tutor/\tx', 'tab in the path'],
]

describe('isSafeAppPath (T18)', () => {
  it.each(ACCEPTED)('accepts %s', (path) => {
    expect(isSafeAppPath(path)).toBe(true)
  })

  it.each(REFUSED)('refuses %j (%s)', (path) => {
    expect(isSafeAppPath(path)).toBe(false)
  })

  it('refuses null and undefined', () => {
    expect(isSafeAppPath(null)).toBe(false)
    expect(isSafeAppPath(undefined)).toBe(false)
  })
})

describe('safeNext (T18)', () => {
  it('keeps a safe path of the role’s own namespace', () => {
    expect(safeNext('/tutor/students?q=an', 'TUTOR')).toBe('/tutor/students?q=an')
    expect(safeNext('/student/work#top', 'STUDENT')).toBe('/student/work#top')
    expect(safeNext('/tutor', 'TUTOR')).toBe('/tutor')
  })

  it('sends another role’s path to the role home', () => {
    expect(safeNext('/student/home', 'TUTOR')).toBe('/tutor/today')
    expect(safeNext('/tutor/students', 'STUDENT')).toBe('/student/home')
  })

  it.each(REFUSED)('sends the unsafe %j (%s) to the role home', (path) => {
    expect(safeNext(path, 'TUTOR')).toBe('/tutor/today')
    expect(safeNext(path, 'STUDENT')).toBe('/student/home')
  })

  it('uses the role home without a next', () => {
    expect(safeNext(null, 'TUTOR')).toBe(roleHome('TUTOR'))
    expect(safeNext(undefined, 'STUDENT')).toBe(roleHome('STUDENT'))
  })
})

describe('loginPath and changePasswordPath', () => {
  it('carry a safe return path, encoded', () => {
    expect(loginPath('/tutor/students')).toBe('/login?next=%2Ftutor%2Fstudents')
    expect(changePasswordPath('/student/work?x=1')).toBe('/change-password?next=%2Fstudent%2Fwork%3Fx%3D1')
  })

  it('drop an unsafe one', () => {
    expect(loginPath('/login')).toBe('/login')
    expect(loginPath('//evil.example')).toBe('/login')
    expect(changePasswordPath('https://evil.example')).toBe('/change-password')
    expect(changePasswordPath(null)).toBe('/change-password')
  })
})
