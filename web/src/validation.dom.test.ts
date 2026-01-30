// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { applyErrors, validateState } from './validation'
import type { FormDataModel } from './types'

const setupDom = (): void => {
  document.body.innerHTML = `
    <input id="domainName" />
    <div data-error="domain"></div>
    <textarea id="primaryGoal"></textarea>
    <div data-error="goal"></div>
    <div id="validationSummary"></div>
    <button data-generate></button>
  `
}

const makeData = (overrides: Partial<FormDataModel> = {}): FormDataModel => ({
  domain: '',
  goal: '',
  entities: [],
  relationships: [],
  inference: '',
  constraints: '',
  ...overrides,
})

describe('validation UI behavior', () => {
  it('disables generate when validation fails and re-enables when valid', () => {
    setupDom()
    const generateButton = document.querySelector<HTMLButtonElement>('[data-generate]')!

    const invalid = makeData()
    const invalidOk = applyErrors(validateState(invalid), invalid)
    expect(invalidOk).toBe(false)
    expect(generateButton.disabled).toBe(true)

    const valid = makeData({ domain: 'Research', goal: 'Extract facts.' })
    const validOk = applyErrors(validateState(valid), valid)
    expect(validOk).toBe(true)
    expect(generateButton.disabled).toBe(false)
  })
})
