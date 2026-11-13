import type { Locator } from '@playwright/test'
import { TUTOR_STATE } from '../support/auth'
import { expectNoMidWordBreak, expectSettledAccessible } from '../support/checks'
import { expect, test } from '../support/fixtures'
import { longData } from '../support/longData'
import {
  apiProfile,
  guardiansRegion,
  h1,
  lpEdit,
  lpForm,
  lpRegion,
  profileStudent,
  shot,
  token,
} from '../support/students'

// T-M2.19 (automated UI checks): AC4 (focus after the actions that remove or disable their own control, those no other
// test performs), AC5 (the motion tokens as rendered) and AC3 (the long-data walk) at the mandatory viewports.

test.use({ storageState: TUTOR_STATE })

test.describe('Motion tokens as rendered (T-M2.19 AC5)', () => {
  /** The computed animation of an element: its duration and whether one runs at all. */
  const animation = (target: Locator) =>
    target.evaluate((el) => {
      const style = getComputedStyle(el)
      return { duration: style.animationDuration, running: style.animationName !== 'none' }
    })

  for (const reduced of [false, true]) {
    test(`the Skeleton pulses in 1.4 s and the Spinner turns in 800 ms${reduced ? '; with reduced motion neither moves' : ''}`, async ({
      page,
    }) => {
      if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' })
      // The list request is held past the 150 ms skeleton delay.
      let releaseList!: () => void
      const listHeld = new Promise<void>((resolve) => (releaseList = resolve))
      await page.route('**/api/v1/tutor/students?**', async (route) => {
        await listHeld
        await route.fallback()
      })
      await page.goto('/tutor/students')
      const skeleton = page.locator('[class*="_skeleton_"]').first()
      await expect(skeleton).toBeVisible()
      await expect
        .poll(() => animation(skeleton))
        .toEqual(reduced ? { duration: '0s', running: false } : { duration: '1.4s', running: true })
      releaseList()
      await page.unrouteAll({ behavior: 'wait' })

      // A guardian Save held: the pending Button shows the Spinner.
      const created = await profileStudent(page, reduced ? 'Chuyển Động Giảm' : 'Chuyển Động')
      let releaseSave!: () => void
      const saveHeld = new Promise<void>((resolve) => (releaseSave = resolve))
      await page.route('**/api/v1/tutor/students/*/guardians', async (route) => {
        if (route.request().method() === 'POST') await saveHeld
        await route.fallback()
      })
      await page.goto(`/tutor/students/${created.student.id}`)
      await guardiansRegion(page).getByRole('button', { name: 'Thêm phụ huynh' }).click()
      const form = page.getByRole('form', { name: 'Phụ huynh mới' })
      await form.getByRole('textbox', { name: 'Tên (bắt buộc)' }).fill('Lê Thị Chờ Lưu')
      await form.getByRole('button', { name: 'Lưu', exact: true }).click()
      const spinner = form.locator('[class*="_spinner_"]')
      await expect(spinner).toBeAttached()
      await expect
        .poll(() => animation(spinner))
        .toEqual(reduced ? { duration: '0s', running: false } : { duration: '0.8s', running: true })
      if (reduced) expect(await spinner.evaluate((el) => getComputedStyle(el).opacity)).toBe('0.6')
      releaseSave()
      await expect(page.getByRole('button', { name: 'Sửa Lê Thị Chờ Lưu' })).toBeFocused()
    })
  }
})

// T-M2.17 extends the walk with the learning profile (its section on the Profile view and its form).
test.describe('Long data (T-M2.19)', () => {
  for (const lang of ['vi', 'en'] as const) {
    test(`[${lang}] the list, the Profile view with a guardian, Edit profile, the guardian form and Add student: settled, accessible, no word broken`, async ({
      page,
    }, testInfo) => {
      const copy = {
        vi: {
          students: 'Học viên',
          editProfile: 'Sửa hồ sơ',
          cancel: 'Huỷ',
          contact: 'Liên hệ (không bắt buộc)',
          guardiansOptional: 'Phụ huynh (không bắt buộc)',
          addGuardian: 'Thêm phụ huynh',
          fullName: 'Họ tên (bắt buộc)',
          username: 'Tên đăng nhập (bắt buộc)',
          guardianName: 'Tên (bắt buộc)',
          relationship: 'Quan hệ',
          editGuardian: 'Sửa',
          guardianRow: 'Phụ huynh 1',
          currentLevel: 'Trình độ hiện tại',
        },
        en: {
          students: 'Students',
          editProfile: 'Edit profile',
          cancel: 'Cancel',
          contact: 'Contact (optional)',
          guardiansOptional: 'Guardians (optional)',
          addGuardian: 'Add guardian',
          fullName: 'Full name (required)',
          username: 'Username (required)',
          guardianName: 'Name (required)',
          relationship: 'Relationship',
          editGuardian: 'Edit',
          guardianRow: 'Guardian 1',
          currentLevel: 'Current level',
        },
      }[lang]
      const data = longData(token())
      await page.addInitScript((l) => localStorage.setItem('englms.locale', l), lang)
      const created = await profileStudent(page, 'x', {
        fullName: data.fullName,
        username: data.username,
        email: data.email,
        guardians: [{ name: data.guardianName, relationship: data.guardianRelationship }],
      })
      // T-M2.17: the learning profile with long values (the same tags in both lists).
      await apiProfile(page, created.student.id, {
        currentLevel: data.learningLevel,
        strengths: data.tags,
        weaknesses: data.tags,
        learningNotes: data.learningNotes,
        customFields: [
          { label: data.fieldLabel, value: data.fieldValue },
          { label: data.fieldLabel.slice(0, 30), value: '' },
        ],
      })
      const main = page.getByRole('main')
      /** Every visible button with text in `scope` (icon-only copy buttons carry no text to break). */
      const textButtons = async (scope: Locator) => {
        const found: Locator[] = []
        for (const button of await scope.getByRole('button').all())
          if ((await button.isVisible()) && (await button.innerText()).trim()) found.push(button)
        return found
      }
      const noBreaks = async (targets: Locator[]) => {
        for (const target of targets) await expectNoMidWordBreak(target)
      }

      // The Students list, filtered to the new student.
      await page.goto(`/tutor/students?q=${encodeURIComponent(data.username)}`)
      const row = main.getByRole('link', { name: data.fullName })
      await expect(row).toBeVisible()
      await expectSettledAccessible(page)
      await noBreaks([row, h1(page, copy.students)])
      await shot(page, testInfo, `long-list-${lang}`)

      // The Profile view with one guardian.
      await row.click()
      await expect(h1(page, data.fullName)).toBeVisible()
      const guardian = guardiansRegion(page).getByRole('heading', { level: 3, name: data.guardianName })
      await expect(guardian).toBeVisible()
      await expectSettledAccessible(page)
      await noBreaks([h1(page, data.fullName), guardian, ...(await main.getByRole('heading', { level: 2 }).all())])
      await noBreaks(await textButtons(main))
      // The learning profile: each chip, term and value (a value holding chips is checked per chip, never as a list).
      const profile = lpRegion(page)
      await expect(profile.getByRole('listitem')).toHaveCount(6)
      await noBreaks([
        ...(await profile.getByRole('listitem').all()),
        ...(await profile.locator('dt').all()),
        ...(await profile.locator('dd:not(:has(ul))').all()),
      ])
      await shot(page, testInfo, `long-profile-${lang}`)

      // Edit profile.
      await main.getByRole('button', { name: copy.editProfile, exact: true }).click()
      const form = page.getByRole('form', { name: copy.editProfile })
      await expect(form).toBeVisible()
      await expectSettledAccessible(page)
      await noBreaks([h1(page, data.fullName), ...(await main.getByRole('heading', { level: 2 }).all())])
      await noBreaks(await textButtons(form))
      await shot(page, testInfo, `long-edit-profile-${lang}`)
      await form.getByRole('button', { name: copy.cancel, exact: true }).click()
      await expect(form).toHaveCount(0)

      // The guardian form.
      await guardiansRegion(page)
        .getByRole('button', { name: `${copy.editGuardian} ${data.guardianName}` })
        .click()
      const guardianForm = guardiansRegion(page).getByRole('form')
      await expect(guardianForm.getByRole('textbox', { name: copy.guardianName })).toHaveValue(data.guardianName)
      await expectSettledAccessible(page)
      await noBreaks(await main.getByRole('heading', { level: 2 }).all())
      await noBreaks(await textButtons(guardianForm))
      await shot(page, testInfo, `long-guardian-form-${lang}`)
      await guardianForm.getByRole('button', { name: copy.cancel, exact: true }).click()
      await expect(guardianForm).toHaveCount(0)

      // The learning-profile form (T-M2.17): each label, legend and chip text, and the text buttons.
      await lpEdit(page).click()
      const profileForm = lpForm(page)
      await expect(profileForm.getByRole('textbox', { name: copy.currentLevel })).toHaveValue(data.learningLevel)
      await expectSettledAccessible(page)
      await noBreaks([
        ...(await profileForm.locator('label').all()),
        ...(await profileForm.locator('legend').all()),
        ...(await profileForm.locator('li [class*="text"]').all()),
      ])
      await noBreaks(await textButtons(profileForm))
      await shot(page, testInfo, `long-learning-profile-form-${lang}`)
      await profileForm.getByRole('button', { name: copy.cancel, exact: true }).click()
      await expect(profileForm).toHaveCount(0)

      // Add student with the long values typed (another run's token: the username stays free).
      const typed = longData(token())
      await page.goto('/tutor/students/new')
      await page.getByRole('textbox', { name: copy.fullName, exact: true }).fill(typed.fullName)
      await page.getByRole('textbox', { name: copy.username }).fill(typed.username)
      await page.getByRole('button', { name: copy.contact }).click()
      await main.getByRole('textbox', { name: 'Email' }).fill(typed.email)
      await page.getByRole('button', { name: copy.guardiansOptional }).click()
      await main.getByRole('button', { name: copy.addGuardian }).click()
      const guardianRow = main.getByRole('group', { name: copy.guardianRow })
      await guardianRow.getByRole('textbox', { name: copy.guardianName }).fill(typed.guardianName)
      await guardianRow.getByRole('textbox', { name: copy.relationship }).fill(typed.guardianRelationship)
      await expectSettledAccessible(page)
      await noBreaks([
        page.getByRole('heading', { level: 1 }),
        ...(await main.getByRole('heading', { level: 2 }).all()),
      ])
      await noBreaks(await textButtons(main))
      await shot(page, testInfo, `long-add-student-${lang}`)
    })
  }
})
