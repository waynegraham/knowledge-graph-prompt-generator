import { describe, expect, it } from 'vitest'
import { buildDefaultState, buildInitialState, migrateState, SCHEMA_VERSION } from './state'

describe('state helpers', () => {
  it('buildInitialState seeds empty entities and relationships', () => {
    const state = buildInitialState()
    expect(state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(state.entities.length).toBe(1)
    expect(state.relationships.length).toBe(1)
  })

  it('buildDefaultState returns configured defaults', () => {
    const state = buildDefaultState()
    expect(state.domain).toContain('Medical')
    expect(state.entities.length).toBeGreaterThan(0)
    expect(state.relationships.length).toBeGreaterThan(0)
  })

  it('migrateState fills missing fields and sets schemaVersion', () => {
    const migrated = migrateState({
      domain: 'Test',
      goal: 'Goal',
      entities: [],
      relationships: [],
      inference: '',
      constraints: '',
      schemaVersion: 0,
    })

    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION)
    expect(migrated.domain).toBe('Test')
    expect(migrated.entities).toEqual([])
    expect(migrated.relationships).toEqual([])
  })
})
