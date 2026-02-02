import type { FormDataModel, EntityDef, PropertyDef, RelationshipDef } from './types'

const STORAGE_KEY = 'kg-prompt-generator:v1'
export const SCHEMA_VERSION = 1
const canonicalizeName = (value: string): string => value.trim().toLowerCase()

const DEFAULT_DATA = {
  domain: 'Medical Research & Clinical Trials',
  goal:
    'Track drug-disease treatment relationships, dosage efficacy, and clinical outcomes from research papers.',
  entities: [
    {
      name: 'Doctor',
      parent: 'Person',
      desc: 'Medical professionals performing the treatment or study.',
      properties: [
        { name: 'specialization', type: 'string', constraint: 'required' },
        { name: 'npi', type: 'string', constraint: 'unique' },
      ],
    },
    {
      name: 'Drug',
      parent: 'Treatment',
      desc: 'Pharmaceutical substances administered to patients.',
      properties: [
        { name: 'generic_name', type: 'string', constraint: 'required' },
        { name: 'approval_date', type: 'date', constraint: 'optional' },
      ],
    },
  ],
  relationships: [
    {
      name: 'PRESCRIBES',
      source: 'Doctor',
      target: 'Drug',
      props: 'dosage, frequency',
    },
  ],
  inference: '',
  constraints:
    'Use only the listed Classes and Relationship Predicates.\nReturn JSON only (no markdown, no prose).\nIf nothing is found, return {"nodes":[],"edges":[]}.\nDates must follow YYYY-MM-DD format.',
}

let idCounter = 0
export const createId = (): string => {
  if ('randomUUID' in crypto) return crypto.randomUUID()
  idCounter += 1
  return `id-${Date.now()}-${idCounter}`
}

export const createEmptyProperty = (): PropertyDef => ({
  id: createId(),
  name: '',
  type: 'string',
  constraint: 'optional',
})

export const createEmptyEntity = (): EntityDef => ({
  id: createId(),
  name: '',
  parent: '',
  desc: '',
  properties: [createEmptyProperty()],
})

export const createEmptyRelationship = (): RelationshipDef => ({
  id: createId(),
  name: '',
  source: '',
  target: '',
  props: '',
})

type LegacyEntity = Omit<Partial<EntityDef>, 'properties'> & {
  properties?: Array<Partial<PropertyDef>>
}

type LegacyRelationship = Partial<RelationshipDef>

export type VersionedState = {
  schemaVersion?: number
  domain?: string
  goal?: string
  entities?: LegacyEntity[]
  relationships?: LegacyRelationship[]
  inference?: string
  constraints?: string
}

export const migrateState = (data: VersionedState): FormDataModel => {
  const version = data.schemaVersion ?? 0

  let migrated: VersionedState = { ...data }

  if (version < 1) {
    migrated = { ...migrated, schemaVersion: 1 }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    domain: migrated.domain ?? '',
    goal: migrated.goal ?? '',
    entities: (migrated.entities ?? []).map((entity) => ({
      id: entity.id ?? createId(),
      name: entity.name ?? '',
      parent: entity.parent ?? '',
      desc: entity.desc ?? '',
      properties: (entity.properties ?? []).map((prop) => ({
        id: prop.id ?? createId(),
        name: prop.name ?? '',
        type: prop.type ?? 'string',
        constraint: (prop.constraint ?? 'optional') as PropertyDef['constraint'],
      })),
    })),
    relationships: (migrated.relationships ?? []).map((rel) => ({
      id: rel.id ?? createId(),
      name: rel.name ?? '',
      source: rel.source ?? '',
      target: rel.target ?? '',
      props: rel.props ?? '',
    })),
    inference: migrated.inference ?? '',
    constraints: migrated.constraints ?? '',
  }
}

export const loadSavedState = (): FormDataModel | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as VersionedState
    if (!parsed || typeof parsed !== 'object') return null
    return migrateState(parsed)
  } catch (error) {
    console.warn('Unable to load saved state', error)
    return null
  }
}

let saveTimer: number | undefined
export const scheduleSave = (data: FormDataModel): void => {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState(data)))
    } catch (error) {
      console.warn('Unable to save state', error)
    }
  }, 250)
}

export const buildDefaultState = (): FormDataModel => ({
  schemaVersion: SCHEMA_VERSION,
  domain: DEFAULT_DATA.domain,
  goal: DEFAULT_DATA.goal,
  entities: DEFAULT_DATA.entities.map((entity) => ({
    id: createId(),
    name: entity.name,
    parent: entity.parent,
    desc: entity.desc,
    properties: entity.properties.map((prop) => ({
      id: createId(),
      name: prop.name,
      type: prop.type,
      constraint: prop.constraint as PropertyDef['constraint'],
    })),
  })),
  relationships: DEFAULT_DATA.relationships.map((rel) => ({
    id: createId(),
    name: rel.name,
    source: rel.source,
    target: rel.target,
    props: rel.props,
  })),
  inference: DEFAULT_DATA.inference,
  constraints: DEFAULT_DATA.constraints,
})

export const buildInitialState = (): FormDataModel => ({
  schemaVersion: SCHEMA_VERSION,
  domain: '',
  goal: '',
  entities: [createEmptyEntity()],
  relationships: [createEmptyRelationship()],
  inference: '',
  constraints: '',
})

let state: FormDataModel = buildInitialState()

export const initState = (): FormDataModel => {
  state = loadSavedState() ?? buildInitialState()
  return state
}

export const getState = (): FormDataModel => state

export const setState = (nextState: FormDataModel): void => {
  state = {
    ...nextState,
    entities: nextState.entities.map((entity) => ({
      ...entity,
      canonicalName: canonicalizeName(entity.name),
      properties: entity.properties.map((prop) => ({ ...prop })),
    })),
    relationships: nextState.relationships.map((rel) => ({
      ...rel,
      canonicalName: canonicalizeName(rel.name),
      canonicalSource: canonicalizeName(rel.source),
      canonicalTarget: canonicalizeName(rel.target),
    })),
  }
}

export const serializeState = (data: FormDataModel): FormDataModel => ({
  schemaVersion: SCHEMA_VERSION,
  domain: data.domain,
  goal: data.goal,
  entities: data.entities.map((entity) => ({
    id: entity.id,
    name: entity.name,
    parent: entity.parent,
    desc: entity.desc,
    properties: entity.properties.map((prop) => ({ ...prop })),
  })),
  relationships: data.relationships.map((rel) => ({
    id: rel.id,
    name: rel.name,
    source: rel.source,
    target: rel.target,
    props: rel.props,
  })),
  inference: data.inference,
  constraints: data.constraints,
})
