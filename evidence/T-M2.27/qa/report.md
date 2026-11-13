# T-M2.27 QA report (G3, tier L, one fresh qa-evaluator; DEC-165)

Head `edfeec4` (code `86ee35c`), PR #170. Agent: 53,720 tokens, 336.6 s (the agent wall clock was about 25 min, including waits on background runs). Recorded by the LC from the agent's returned text.

QA-VERDICT T-M2.27: PASS WITH MINOR

All six ACs hold on head `edfeec4` (code `86ee35c`). Every rerun passed, and both old forms failed where they should. The one finding is S4: the reproduction command in the evidence summary no longer reproduces anything on the final head.

**Mode:** QA (qa-protocol §2), tier L, test code only. Because the diff is the product here, I read it as you asked in step 1.

**1. Diff review (`git diff 6f284c4..HEAD -- e2e/`)**
- **Files touched:** only `e2e/tests/loading.spec.ts` (+1 line) and `e2e/tests/students.spec.ts`. Nothing in `e2e/support/**`, `playwright.config.ts`, product code or scripts. No `shortcut:` or `ponytail:` marker in `e2e/`.
- **(b) `loading.spec.ts:178`:** one added line, `await expect(region).toHaveAttribute('aria-busy', 'true')`, with the default budget. No timeout changed and nothing removed. AC2 met.
- **(c) `students.spec.ts:1805`:** the single read became `await expect.poll(() => guardianNames(page)).toEqual(['Vũ Thị Hư Cấu'])`. The expected value is the same and no other line changed. AC3 met.
- **(a) `onlyArchived` (`students.spec.ts:2220-2228`):** the `size=1` check still passes through first, unchanged. A request without ARCHIVED still gets the same empty answer. Only an archived-inclusive request gets the `q` added. Called without `q` (the any-student test, line 2247), it behaves exactly as before.
- **(a) the test (`students.spec.ts:2258-2278`):**
  - It creates its own student with a `token()` name and archives it, checking for `200`.
  - `noActive` `toHaveCount(0)`, `expectFocusNotLost` and the checkbox `toBeFocused()` are all kept.
  - The added `expect(page).not.toHaveURL(/[?&]q=/)` proves the page URL has no `q`.
  - The badge is now read inside the row or list item that holds the student's own link, instead of `.first()` on the page. That is stricter.
  - No assertion is removed or weakened. AC1 met.

**2. AC5 reruns (each test selected with `-g`, `--retries=0`)**
| Test | phone-small ×20 | tablet + laptop ×5 |
|---|---|---|
| (a) only archived students: Include archived | 20 passed (12.9s) | 10 passed (9.2s) |
| (b) the loading region in English | 20 passed (9.5s) | 10 passed (7.3s) |
| (c) AC4: two pages: a stale save… | 20 passed (28.0s) | 10 passed (20.1s) |

**Crowded DB:** a read-only count on the dev DB showed 1,065 active, 30 paused and 133 archived students. So the (a) runs above are already against a database with far more than 25 active students. I added no rows beyond what normal test runs add, and purged nothing.

**3. Old-form reproductions (one scratch run, all three projects, `--retries=0`)**
- **A problem with the generator:** `make-scratch.py` takes the "old" form from `git show HEAD:…`. On the final head, HEAD already holds the new code, so run as-is it would compare the new form with itself. I ran a copy that reads from `6f284c4` instead (`.claude/scratch/lc-records/T-M2.27/qa/make-scratch-qa.py`) and skipped the (b) copies.
- **Overall result:** 9 failed, 15 passed. Every failure is an old form, and every new form passed.
- **(a) under the simulated crowded-DB route:**
  - The old form failed on all 3 projects: `getByText('Đã lưu trữ').first()` not found, route log "archived on page: 0".
  - The new form passed on all 3, route log "pass-through …&q=Chỉ Lưu Trữ …".
- **(a) on the real crowded DB, with no simulating route:** the old (a) test is also inside the c-old copy. It failed on all 3 projects, while the new (a) inside the c-new copy passed on all 3. This reproduces the DEC-162 failure on real data, not just the simulation.
- **(c) with the 300 ms refetch delay:**
  - The old single read failed on all 3 projects: received an extra "Vũ Văn Giả". The console-guard 409/404 errors that follow come from the test stopping before its `acceptStatus` lines.
  - The polling form passed on all 3.

**4. Any-student check test:** "the any-student check error: Try again: focus to the h1", phone-small ×5: 5 passed (8.4s).

**CI on PR #170 (when I checked):** contract-drift, container-build, web, backend, docs-check and secrets-scan passed; e2e-smoke was still pending. AC6 is not complete until it is green.

**Cleanup:** the scratch spec files are deleted (0 left under `e2e/tests/`), `git status --short` is clean, and no evidence files were rewritten. Raw logs are in `/home/linux/Projects/eng-lms/.claude/scratch/lc-records/T-M2.27/qa/`.

**Findings**
- **S4, `evidence/T-M2.27/summary.md:17`:** the AC4 command points at `make-scratch.py`, which reads the old form from `HEAD`. On the final head that gives new versus new, so the recorded reproduction cannot be repeated as written.
  - Fix in the records PR: say in the summary that the old form comes from `6f284c4` (or `HEAD~3`), or change the generator to `git show 6f284c4:…`.
- **S4 (residual risk, not a defect):** for (b), the summary says the new form still fails 6/20 at CPU throttle rate 30, where the region itself takes more than 5 s to appear. The packet accepts this under its Risks section, and the CI failure itself was never reproduced. If phone-small fails again on CI, the next step is beyond this packet's "no timeout raised" rule.
- **SCOPE:** none. **Open questions:** none. None of the out-of-scope `guardianNames` single reads failed in these runs.

I did not rerun the (b) CPU-throttle reproduction or `gate.sh`; neither was asked.

Wall-clock: about 25 minutes.