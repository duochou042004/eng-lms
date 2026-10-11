import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { chromium, type FullConfig } from '@playwright/test'
import {
  apiCall,
  apiChangePassword,
  apiSignIn,
  BOOTSTRAP_PASSWORD_FILE,
  createStudent,
  generatePassword,
  readSecret,
  STUDENT_STATE,
  TUTOR_PASSWORD_FILE,
  TUTOR_STATE,
  TUTOR_USERNAME,
} from './auth'

function writeSecret(file: string, value: string) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 })
  writeFileSync(file, `${value}\n`, { mode: 0o600 })
}

/**
 * Signs in as the E2E tutor (T-M2.4 scope 10): with the stored password (.data/e2e/tutor-password) when it works, else
 * with the bootstrap password; a first sign-in does the forced change to a generated password and stores it, so re-runs
 * reuse it. Then stores the tutor's session and a student's (created here, past the forced change) for the specs.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:8080'
  const bootstrap = readSecret(BOOTSTRAP_PASSWORD_FILE)
  if (!bootstrap)
    throw new Error(`E2E sign-in: no ${BOOTSTRAP_PASSWORD_FILE}; run the suite through scripts/e2e-run.sh`)
  const browser = await chromium.launch()
  try {
    const tutorContext = await browser.newContext({ baseURL })
    const tutor = await tutorContext.newPage()
    await tutor.goto('/login')

    let password: string | null = null
    let mustChange = false
    for (const candidate of [readSecret(TUTOR_PASSWORD_FILE), bootstrap]) {
      if (!candidate) continue
      const signedIn = await apiSignIn(tutor, { username: TUTOR_USERNAME, password: candidate })
      if (signedIn.status === 200) {
        password = candidate
        mustChange = signedIn.body.mustChangePassword
        break
      }
    }
    if (!password) {
      throw new Error(
        `E2E sign-in: neither the stored password (${TUTOR_PASSWORD_FILE}) nor the bootstrap password signs in as ` +
          `'${TUTOR_USERNAME}', so the dev database holds another tutor or another password. To start from an empty ` +
          'database run scripts/dev-down.sh --purge (it DELETES the local dev data), then run the suite again.',
      )
    }
    if (mustChange) {
      // Stored before the change: if the change fails, the next run falls back to the bootstrap password.
      const next = generatePassword()
      writeSecret(TUTOR_PASSWORD_FILE, next)
      const changed = await apiCall(tutor, 'POST', '/api/v1/auth/password', {
        currentPassword: password,
        newPassword: next,
      })
      if (changed.status !== 204)
        throw new Error(`E2E sign-in: the tutor's first password change answered ${changed.status}`)
    } else if (password === bootstrap) {
      writeSecret(TUTOR_PASSWORD_FILE, password)
    }
    mkdirSync(dirname(TUTOR_STATE), { recursive: true, mode: 0o700 })
    await tutorContext.storageState({ path: TUTOR_STATE })

    const studentContext = await browser.newContext({ baseURL })
    const student = await studentContext.newPage()
    await student.goto('/login')
    const temporary = await createStudent(tutor, 'shared')
    const signedIn = await apiSignIn(student, temporary)
    if (signedIn.status !== 200)
      throw new Error(`E2E sign-in: the shared student's sign-in answered ${signedIn.status}`)
    await apiChangePassword(student, temporary)
    await studentContext.storageState({ path: STUDENT_STATE })
  } finally {
    await browser.close()
  }
}
