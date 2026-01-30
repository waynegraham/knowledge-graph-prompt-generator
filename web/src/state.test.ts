// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { migrateState, SCHEMA_VERSION, serializeState } from './state'
import type { FormDataModel } from './types'

const makeBaseData = (): FormDataModel => ({
  schemaVersion: SCHEMA_VERSION,
  domain: 'Example Domain',
  goal: 'Extract facts.',
  entities: [
    {
      id: 'e-1',
      name: 'Person',
      canonicalName: 'person',
      parent: '',
      desc: 'A human.',
      properties: [{ id: 'p-1', name: 'age', type: 'number', constraint: 'optional' }],
    },
  ],
  relationships: [
    {
      id: 'r-1',
      name: 'EMPLOYED_BY',
      canonicalName: 'employed_by',
      source: 'Person',
      canonicalSource: 'person',
      target: 'Organization',
      canonicalTarget: 'organization',
      props: 'since',
    },
  ],
  inference: 'If X EMPLOYED_BY Y, then X WORKS_AT Y',
  constraints: 'Person must have a name',
})

describe('state migrate/export flows', () => {
  it('migrates legacy data and fills ids + defaults', () => {
    const legacy = {
      domain: 'Legacy',
      goal: '',
      entities: [{ name: 'Thing', properties: [{}] }],
      relationships: [{ name: 'REL', source: 'Thing', target: 'Thing' }],
      inference: '',
      constraints: '',
    }

    const migrated = migrateState(legacy)

    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION)
    expect(migrated.domain).toBe('Legacy')
    expect(migrated.entities[0].id).toEqual(expect.any(String))
    expect(migrated.entities[0].properties[0].id).toEqual(expect.any(String))
    expect(migrated.relationships[0].id).toEqual(expect.any(String))
    expect(migrated.entities[0].name).toBe('Thing')
  })

  it('serializes without canonical fields for export', () => {
    const data = makeBaseData()
    const serialized = serializeState(data)

    expect(serialized.schemaVersion).toBe(SCHEMA_VERSION)
    expect(serialized.entities[0]).not.toHaveProperty('canonicalName')
    expect(serialized.relationships[0]).not.toHaveProperty('canonicalName')
    expect(serialized.relationships[0]).not.toHaveProperty('canonicalSource')
    expect(serialized.relationships[0]).not.toHaveProperty('canonicalTarget')
  })

  it('round-trips export/import via migrateState', () => {
    const data = makeBaseData()
    const payload = JSON.stringify(serializeState(data))
    const parsed = JSON.parse(payload)

    const migrated = migrateState(parsed)

    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION)
    expect(migrated.domain).toBe(data.domain)
    expect(migrated.entities[0].name).toBe('Person')
    expect(migrated.relationships[0].name).toBe('EMPLOYED_BY')
  })
})
