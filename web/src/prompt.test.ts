import { describe, expect, it } from 'vitest'
import { buildPrompt } from './prompt'
import type { FormDataModel } from './types'

const makeBaseData = (): FormDataModel => ({
  domain: 'Test Domain',
  goal: 'Extract facts.',
  entities: [
    {
      id: 'e-1',
      name: 'Person',
      parent: '',
      desc: 'A human.',
      properties: [
        { id: 'p-1', name: 'age', type: 'number', constraint: 'optional' },
        { id: 'p-2', name: 'name', type: 'string', constraint: 'required' },
      ],
    },
    {
      id: 'e-2',
      name: 'Organization',
      parent: '',
      desc: 'A company.',
      properties: [{ id: 'p-3', name: 'legal_name', type: 'string', constraint: 'required' }],
    },
  ],
  relationships: [
    {
      id: 'r-1',
      name: 'EMPLOYED_BY',
      source: 'Person',
      target: 'Organization',
      props: 'since, role',
    },
  ],
  inference: 'If X EMPLOYED_BY Y, then X WORKS_AT Y',
  constraints: 'Person must have a name',
})

describe('buildPrompt', () => {
  it('produces deterministic output regardless of input order', () => {
    const base = makeBaseData()
    const shuffled: FormDataModel = {
      ...base,
      entities: [...base.entities].reverse(),
      relationships: [...base.relationships].reverse(),
    }

    const out1 = buildPrompt(base)
    const out2 = buildPrompt(shuffled)

    expect(out1).toEqual(out2)
  })

  it('sorts relationship edge properties alphabetically', () => {
    const base = makeBaseData()
    base.relationships[0].props = 'role, since, department'

    const out = buildPrompt(base)
    const expectedSnippet = 'Edge Properties: [department, role, since]'

    expect(out).toContain(expectedSnippet)
  })

  it('escapes triple backticks in user input', () => {
    const base = makeBaseData()
    base.goal = 'Use ```json blocks``` safely.'

    const out = buildPrompt(base)
    expect(out).toContain('Use \\`\\`\\`json blocks\\`\\`\\` safely.')
  })

  it('falls back when required fields are missing', () => {
    const base = makeBaseData()
    base.domain = ''
    base.goal = ''
    base.entities = []
    base.relationships = []
    base.inference = ''
    base.constraints = ''

    const out = buildPrompt(base)
    expect(out).toContain('specified')
    expect(out).toContain('No extraction goal provided.')
    expect(out).toContain('No classes defined.')
    expect(out).toContain('No relationship predicates defined.')
    expect(out).toContain('No specific inference rules provided.')
  })
})
