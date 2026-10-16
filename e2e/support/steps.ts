import { expect, test } from '@playwright/test'

/**
 * Step-budget counter for critical flows (ux-flows.md step budgets): wrap each user-visible step, then assert the
 * total. Each step is also a Playwright report step.
 */
export class StepCounter {
  private readonly labels: string[] = []

  async step<T>(label: string, action: () => Promise<T>): Promise<T> {
    this.labels.push(label)
    return test.step(`step ${this.labels.length}: ${label}`, action)
  }

  /** The named steps in order (the evidence step log, T-M2.5 AC12 (o)). */
  get steps(): readonly string[] {
    return [...this.labels]
  }

  get count() {
    return this.labels.length
  }

  expectAtMost(budget: number) {
    expect(this.count, `step budget ${budget} exceeded: ${this.labels.join(' → ')}`).toBeLessThanOrEqual(budget)
  }
}
