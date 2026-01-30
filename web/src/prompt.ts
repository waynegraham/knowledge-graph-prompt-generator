import type { FormDataModel, EntityDef, PropertyDef, RelationshipDef } from './types'

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })

const clean = (value: string): string => value.trim()

const escapeText = (value: string): string =>
  value.replace(/```/g, '\\`\\`\\`').replace(/\r\n/g, '\n')

const sortByName = <T extends { name: string; id: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => {
    const nameCompare = collator.compare(a.name, b.name)
    return nameCompare !== 0 ? nameCompare : a.id.localeCompare(b.id)
  })

const normalizeProps = (props: PropertyDef[]): PropertyDef[] =>
  sortByName(
    props
      .map((p) => ({
        ...p,
        name: escapeText(clean(p.name)),
        type: escapeText(clean(p.type)),
        constraint: p.constraint,
      }))
      .filter((p) => p.name.length > 0)
  )

const normalizeEntities = (entities: EntityDef[]): EntityDef[] =>
  sortByName(
    entities
      .map((e) => ({
        ...e,
        name: escapeText(clean(e.name)),
        parent: escapeText(clean(e.parent)),
        desc: escapeText(clean(e.desc)),
        properties: normalizeProps(e.properties),
      }))
      .filter((e) => e.name.length > 0)
  )

const normalizeRelationships = (rels: RelationshipDef[]): RelationshipDef[] =>
  sortByName(
    rels
      .map((r) => ({
        ...r,
        name: escapeText(clean(r.name)),
        source: escapeText(clean(r.source)),
        target: escapeText(clean(r.target)),
        props: escapeText(clean(r.props)),
      }))
      .filter((r) => r.name.length > 0)
  )

const formatPropList = (props: PropertyDef[], constraint: PropertyDef['constraint']): string => {
  const filtered = props.filter((p) => p.constraint === constraint)
  return filtered.length
    ? filtered.map((p) => `${p.name} [${p.type}]`).join(', ')
    : 'None'
}

const formatEdgeProps = (props: string): string => {
  if (!props) return ''
  const list = props
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .sort(collator.compare)
  return list.length ? ` | Edge Properties: [${list.join(', ')}]` : ''
}

export const buildPrompt = (data: FormDataModel): string => {
  const domain = escapeText(clean(data.domain))
  const goal = escapeText(clean(data.goal))
  const entities = normalizeEntities(data.entities)
  const relationships = normalizeRelationships(data.relationships)
  const inference = escapeText(clean(data.inference))
  const constraints = escapeText(clean(data.constraints))

  const entitySection = entities.length
    ? entities
        .map((e) => {
          const required = formatPropList(e.properties, 'required')
          const optional = formatPropList(e.properties, 'optional')
          const unique = formatPropList(e.properties, 'unique')
          return `\n### Class: ${e.name} ${e.parent ? `(Sub-class of: ${e.parent})` : ''}\n- **Definition:** ${e.desc || 'No description provided.'}\n- **Required Properties:** ${required}\n- **Optional Properties:** ${optional}\n- **Unique Properties:** ${unique}`
        })
        .join('\n')
    : '- No classes defined.'

  const relationshipSection = relationships.length
    ? relationships
        .map(
          (r) =>
            `\n- **${r.name}**: (Source: ${r.source || 'Unspecified'}) → (Target: ${r.target || 'Unspecified'})${formatEdgeProps(r.props)}`
        )
        .join('\n')
    : '- No relationship predicates defined.'

  return `# SYSTEM PROMPT: ADVANCED KNOWLEDGE GRAPH EXTRACTION
You are an expert Ontology Engineer and Information Extraction specialist for the ${domain || 'specified'} domain.
## MISSION
${goal || 'No extraction goal provided.'}
## CONCEPTUAL HIERARCHY (CLASSES)
The following entity classes define the nodes of our graph. Pay close attention to parent-child relationships.
${entitySection}
## RELATIONSHIP SCHEMA (PREDICATES)
Define these edges connecting the instances of the classes above.
${relationshipSection}
## LOGICAL ONTOLOGY & INFERENCE RULES
Apply these logical rules during extraction:
${inference || '- No specific inference rules provided.'}
## STRUCTURAL CONSTRAINTS
Strictly adhere to these graph constraints:
${constraints || '- Ensure all typed literals match their declared types (String, Number, Date).'}
## OUTPUT REQUIREMENTS (JSON)
Return only a valid JSON object with:
\`\`\`json
{
  "nodes": [
    { "id": "unique_id", "class": "ClassName", "properties": { "name": "val", ... }, "evidence": "verbatim text" }
  ],
  "edges": [
    { "source": "node_id", "predicate": "REL_NAME", "target": "node_id", "properties": { ... }, "evidence": "verbatim text" }
  ]
}
\`\`\``
}
