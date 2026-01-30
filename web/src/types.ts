export type PropertyConstraint = 'optional' | 'required' | 'unique'

export interface PropertyDef {
  id: string
  name: string
  type: string
  constraint: PropertyConstraint
}

export interface EntityDef {
  id: string
  name: string
  parent: string
  desc: string
  properties: PropertyDef[]
}

export interface RelationshipDef {
  id: string
  name: string
  source: string
  target: string
  props: string
}

export interface FormDataModel {
  schemaVersion?: number
  domain: string
  goal: string
  entities: EntityDef[]
  relationships: RelationshipDef[]
  inference: string
  constraints: string
}
