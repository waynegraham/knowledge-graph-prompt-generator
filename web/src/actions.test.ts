/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import { ACTIONS } from './ui'

describe('ACTIONS', () => {
  it('contains unique action values', () => {
    const values = Object.values(ACTIONS)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })

  it('exposes all required action names', () => {
    const required = [
      'add-entity',
      'add-relationship',
      'add-property',
      'remove-entity',
      'remove-relationship',
      'remove-property',
      'use-defaults',
      'export-json',
      'import-json',
      'generate',
      'copy',
    ]

    required.forEach((action) => {
      expect(Object.values(ACTIONS)).toContain(action)
    })
  })
})
