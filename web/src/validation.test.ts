import { describe, expect, it } from 'vitest'
import { validateState } from './validation'
import type { FormDataModel } from './types'

const makeState = (): FormDataModel => ({
  schemaVersion: 1,
  domain: 'Test',
  goal: 'Goal',
  entities: [
    { id: 'e1', name: 'Person', parent: '', desc: '', properties: [] },
    { id: 'e2', name: 'Company', parent: '', desc: '', properties: [] },
  ],
  relationships: [
    { id: 'r1', name: 'WORKS_AT', source: 'Person', target: 'Company', props: '' },
  ],
  inference: '',
  constraints: '',
})

describe('validateState', () => {
  it('flags missing domain and goal', () => {
    const state = makeState()
    state.domain = ''
    state.goal = ''

    const errors = validateState(state)
    expect(errors.domain).toBeDefined()
    expect(errors.goal).toBeDefined()
  })

  it('flags duplicate entity names (case-insensitive)', () => {
    const state = makeState()
    state.entities[1].name = 'person'

    const errors = validateState(state)
    expect(Object.keys(errors.entityNames).length).toBeGreaterThan(0)
  })

  it('flags relationships referencing unknown classes', () => {
    const state = makeState()
    state.relationships[0].source = 'Unknown'

    const errors = validateState(state)
    expect(Object.keys(errors.relationshipSources).length).toBeGreaterThan(0)
  })
})
