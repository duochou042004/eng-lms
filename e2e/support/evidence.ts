import { mkdirSync } from 'node:fs'
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
