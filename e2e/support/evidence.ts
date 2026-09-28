import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Page, TestInfo } from '@playwright/test'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/**
 * Evidence screenshot (evidence-protocol): with ENGLMS_TASK=T-Mx.y set, writes
 * evidence/<task>/screenshots/<project>/<name>.png; without it, does nothing.
 */
export async function evidenceShot(page: Page, testInfo: TestInfo, name: string) {
  const task = process.env.ENGLMS_TASK
  if (!task) return
  if (!/^T-[A-Za-z0-9.]+$/.test(task)) throw new Error(`ENGLMS_TASK must look like T-M1.6 (got: ${task})`)
  const file = join(REPO_ROOT, 'evidence', task, 'screenshots', testInfo.project.name, `${name}.png`)
  mkdirSync(dirname(file), { recursive: true })
  await page.screenshot({ path: file, fullPage: true })
}

/**
 * Evidence record (measurements, step counts): with ENGLMS_TASK set, writes
 * evidence/<task>/records/<project>/<name>.json; always attaches the data to the Playwright report.
 */
export async function evidenceRecord(testInfo: TestInfo, name: string, data: unknown) {
  const body = JSON.stringify(data, null, 2)
  await testInfo.attach(name, { body, contentType: 'application/json' })
  const task = process.env.ENGLMS_TASK
  if (!task) return
  if (!/^T-[A-Za-z0-9.]+$/.test(task)) throw new Error(`ENGLMS_TASK must look like T-M1.6 (got: ${task})`)
  const file = join(REPO_ROOT, 'evidence', task, 'records', testInfo.project.name, `${name}.json`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${body}\n`)
}
