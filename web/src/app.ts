import type { FormDataModel, EntityDef, PropertyDef, RelationshipDef } from './types'
import { buildPrompt } from './prompt'

const DEFAULT_DATA = {
  domain: 'Medical Research & Clinical Trials',
  goal:
    'Track drug-disease treatment relationships, dosage efficacy, and clinical outcomes from research papers.',
  entities: [
    {
      name: 'Doctor',
      parent: 'Person',
      desc: 'Medical professionals performing the treatment or study.',
      properties: [{ name: 'specialization', type: 'string', constraint: 'required' }],
    },
    {
      name: 'Drug',
      parent: 'Treatment',
      desc: 'Pharmaceutical substances administered to patients.',
      properties: [{ name: 'approval_date', type: 'date', constraint: 'optional' }],
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
  inference: 'If X PRESCRIBES Y, then X KNOWS_OF Y\nIf X WORKS_AT Y and Y PART_OF Z, then X WORKS_AT Z',
  constraints: "A 'Patient' must have a unique 'MedicalRecordID'\nDates must follow YYYY-MM-DD format",
}

const appTemplate = `
  <div id="notification" class="notification" role="status" aria-live="polite"></div>
  <div class="container">
    <header class="header">
      <h1>🧠 Advanced KG Prompt Generator</h1>
      <p>Design multi-layered Ontologies and generate high-precision Extraction Prompts</p>
    </header>

    <form id="kgForm" class="form-content" novalidate>
      <section class="section">
        <div class="section-title">
          <span class="section-number">1</span>
          Domain & Objectives
        </div>
        <div class="form-group">
          <label for="domainName">Domain Name *</label>
          <input type="text" id="domainName" required placeholder="e.g., Financial Audit, Medical Research" />
        </div>
        <div class="form-group">
          <label for="primaryGoal">Extraction Goal *</label>
          <textarea
            id="primaryGoal"
            required
            placeholder="e.g., Build a treatment-disease mapping with clinical outcome metrics..."
          ></textarea>
        </div>
      </section>

      <section class="section">
        <div class="section-title">
          <span class="section-number">2</span>
          Class Hierarchy (Entity Types)
        </div>
        <p class="muted-text">
          Define your entities. Use <strong>Parent Class</strong> to create hierarchies (e.g., a "Surgeon" is a type of
          "Doctor").
        </p>
        <div id="entitiesList" class="dynamic-list"></div>
        <button type="button" class="btn btn-outline" data-action="add-entity">+ Add Entity Class</button>
      </section>

      <section class="section">
        <div class="section-title">
          <span class="section-number">3</span>
          Relationship Predicates
        </div>
        <div id="relationshipsList" class="dynamic-list"></div>
        <button type="button" class="btn btn-outline" data-action="add-relationship">+ Add Relationship Type</button>
      </section>

      <section class="section">
        <div class="section-title">
          <span class="section-number">4</span>
          Global Ontology Rules
        </div>
        <div class="form-group">
          <label for="inferenceRules">Inference Rules (One per line)</label>
          <textarea
            id="inferenceRules"
            placeholder="e.g., If X is BORN_IN Y, then X LIVES_IN Y (implied)\nIf X PART_OF Y and Y PART_OF Z, then X PART_OF Z (transitive)"
          ></textarea>
          <div class="help-text">Define logic that the LLM should use to infer "hidden" relationships.</div>
        </div>
        <div class="form-group">
          <label for="globalConstraints">Global Constraints</label>
          <textarea
            id="globalConstraints"
            placeholder="e.g., A 'Person' can have at most one 'BirthDate'\nA 'Company' must have at least one 'Headquarters'"
          ></textarea>
        </div>
      </section>

      <div class="section-actions">
        <button type="button" class="btn btn-outline btn-lg" data-action="use-defaults">
          📝 Use Default Values
        </button>
        <button type="button" class="btn btn-primary btn-lg" data-action="generate">
          ✨ Generate Professional Prompt
        </button>
      </div>
    </form>

    <section id="outputSection" class="output-section" aria-live="polite">
      <div class="output-header">
        <h2>🚀 Optimized System Prompt</h2>
        <button class="btn btn-outline btn-invert" data-action="copy">📋 Copy to Clipboard</button>
      </div>
      <div id="promptOutput" class="output-content"></div>
    </section>
  </div>
`

const appRoot = document.querySelector<HTMLDivElement>('#app')

let idCounter = 0
const createId = (): string => {
  if ('randomUUID' in crypto) return crypto.randomUUID()
  idCounter += 1
  return `id-${Date.now()}-${idCounter}`
}

const showNotification = (message: string): void => {
  const nav = document.getElementById('notification')
  if (!nav) return
  nav.textContent = message
  nav.style.display = 'block'
  window.setTimeout(() => {
    nav.style.display = 'none'
  }, 3000)
}

const createPropertyRow = (data?: Partial<PropertyDef>): HTMLDivElement => {
  const propId = createId()
  const row = document.createElement('div')
  row.className = 'sub-item'
  row.dataset.propId = propId
  row.innerHTML = `
    <div>
      <input type="text" class="prop-name" placeholder="Prop Name (e.g., age)" />
    </div>
    <div>
      <select class="prop-type">
        <option value="string">String</option>
        <option value="number">Number</option>
        <option value="date">Date</option>
        <option value="boolean">Boolean</option>
      </select>
    </div>
    <div>
      <select class="prop-constraint">
        <option value="optional">Optional</option>
        <option value="required">Required</option>
        <option value="unique">Unique</option>
      </select>
    </div>
    <button type="button" class="btn btn-remove" data-action="remove-property">×</button>
  `

  if (data?.name) row.querySelector<HTMLInputElement>('.prop-name')!.value = data.name
  if (data?.type) row.querySelector<HTMLSelectElement>('.prop-type')!.value = data.type
  if (data?.constraint)
    row.querySelector<HTMLSelectElement>('.prop-constraint')!.value = data.constraint

  return row
}

const createEntityItem = (data?: Partial<EntityDef>): HTMLDivElement => {
  const entityId = createId()
  const div = document.createElement('div')
  div.className = 'dynamic-item entity-item'
  div.dataset.entityId = entityId
  div.innerHTML = `
    <button type="button" class="btn btn-remove" data-action="remove-item">Remove</button>
    <div class="grid-2">
      <div class="form-group">
        <label>Class Name</label>
        <input type="text" class="entity-name" placeholder="e.g., Professor" />
      </div>
      <div class="form-group">
        <label>Parent Class (Optional)</label>
        <input type="text" class="entity-parent" placeholder="e.g., Person" />
      </div>
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea class="entity-desc" rows="2" placeholder="What does this class represent?"></textarea>
    </div>
    <div class="form-group">
      <label>Properties (Attributes)</label>
      <div class="sub-item-list" data-entity-id="${entityId}"></div>
      <button type="button" class="btn btn-outline btn-sm" data-action="add-property" data-entity-id="${entityId}">
        + Add Property
      </button>
    </div>
  `

  if (data?.name) div.querySelector<HTMLInputElement>('.entity-name')!.value = data.name
  if (data?.parent) div.querySelector<HTMLInputElement>('.entity-parent')!.value = data.parent
  if (data?.desc) div.querySelector<HTMLTextAreaElement>('.entity-desc')!.value = data.desc

  const propList = div.querySelector<HTMLDivElement>('.sub-item-list')
  if (!propList) return div

  if (data?.properties?.length) {
    data.properties.forEach((prop) => propList.appendChild(createPropertyRow(prop)))
  } else {
    propList.appendChild(createPropertyRow())
  }

  return div
}

const createRelationshipItem = (data?: Partial<RelationshipDef>): HTMLDivElement => {
  const relId = createId()
  const div = document.createElement('div')
  div.className = 'dynamic-item relationship-item'
  div.dataset.relationshipId = relId
  div.innerHTML = `
    <button type="button" class="btn btn-remove" data-action="remove-item">Remove</button>
    <div class="form-group">
      <label>Predicate Name (Relationship)</label>
      <input type="text" class="rel-name" placeholder="e.g., GRADUATED_FROM" />
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label>Source Class</label>
        <input type="text" class="rel-source" placeholder="e.g., Person" />
      </div>
      <div class="form-group">
        <label>Target Class</label>
        <input type="text" class="rel-target" placeholder="e.g., University" />
      </div>
    </div>
    <div class="form-group">
      <label>Properties for this Edge</label>
      <input type="text" class="rel-props" placeholder="e.g., year, degree_type (comma separated)" />
    </div>
  `

  if (data?.name) div.querySelector<HTMLInputElement>('.rel-name')!.value = data.name
  if (data?.source) div.querySelector<HTMLInputElement>('.rel-source')!.value = data.source
  if (data?.target) div.querySelector<HTMLInputElement>('.rel-target')!.value = data.target
  if (data?.props) div.querySelector<HTMLInputElement>('.rel-props')!.value = data.props

  return div
}

const collectFormData = (): FormDataModel => {
  const domain = (document.getElementById('domainName') as HTMLInputElement).value
  const goal = (document.getElementById('primaryGoal') as HTMLTextAreaElement).value
  const inference = (document.getElementById('inferenceRules') as HTMLTextAreaElement).value
  const constraints = (document.getElementById('globalConstraints') as HTMLTextAreaElement).value

  const entities: EntityDef[] = Array.from(
    document.querySelectorAll<HTMLDivElement>('#entitiesList .entity-item')
  ).map((item) => {
    const properties = Array.from(item.querySelectorAll<HTMLDivElement>('.sub-item')).map((p) => ({
      id: p.dataset.propId || createId(),
      name: (p.querySelector<HTMLInputElement>('.prop-name')?.value ?? ''),
      type: (p.querySelector<HTMLSelectElement>('.prop-type')?.value ?? 'string'),
      constraint: (p.querySelector<HTMLSelectElement>('.prop-constraint')?.value ?? 'optional') as
        | 'optional'
        | 'required'
        | 'unique',
    }))

    return {
      id: item.dataset.entityId || createId(),
      name: item.querySelector<HTMLInputElement>('.entity-name')?.value ?? '',
      parent: item.querySelector<HTMLInputElement>('.entity-parent')?.value ?? '',
      desc: item.querySelector<HTMLTextAreaElement>('.entity-desc')?.value ?? '',
      properties,
    }
  })

  const relationships: RelationshipDef[] = Array.from(
    document.querySelectorAll<HTMLDivElement>('#relationshipsList .relationship-item')
  ).map((item) => ({
    id: item.dataset.relationshipId || createId(),
    name: item.querySelector<HTMLInputElement>('.rel-name')?.value ?? '',
    source: item.querySelector<HTMLInputElement>('.rel-source')?.value ?? '',
    target: item.querySelector<HTMLInputElement>('.rel-target')?.value ?? '',
    props: item.querySelector<HTMLInputElement>('.rel-props')?.value ?? '',
  }))

  return {
    domain,
    goal,
    entities,
    relationships,
    inference,
    constraints,
  }
}

const setDefaults = (): void => {
  const entitiesList = document.getElementById('entitiesList')
  const relationshipsList = document.getElementById('relationshipsList')
  if (!entitiesList || !relationshipsList) return

  entitiesList.innerHTML = ''
  relationshipsList.innerHTML = ''

  ;(document.getElementById('domainName') as HTMLInputElement).value = DEFAULT_DATA.domain
  ;(document.getElementById('primaryGoal') as HTMLTextAreaElement).value = DEFAULT_DATA.goal

  DEFAULT_DATA.entities.forEach((entity) => {
    const item = createEntityItem(entity)
    entitiesList.appendChild(item)
  })

  DEFAULT_DATA.relationships.forEach((rel) => {
    const item = createRelationshipItem(rel)
    relationshipsList.appendChild(item)
  })

  ;(document.getElementById('inferenceRules') as HTMLTextAreaElement).value = DEFAULT_DATA.inference
  ;(document.getElementById('globalConstraints') as HTMLTextAreaElement).value = DEFAULT_DATA.constraints

  showNotification('✅ Form populated with default research values!')
}

const ensureRequiredFields = (): boolean => {
  const domain = document.getElementById('domainName') as HTMLInputElement
  const goal = document.getElementById('primaryGoal') as HTMLTextAreaElement
  if (!domain.value.trim()) {
    domain.focus()
    showNotification('Please enter a domain name.')
    return false
  }
  if (!goal.value.trim()) {
    goal.focus()
    showNotification('Please enter an extraction goal.')
    return false
  }
  return true
}

const generatePrompt = (): void => {
  if (!ensureRequiredFields()) return
  const data = collectFormData()
  const prompt = buildPrompt(data)
  const output = document.getElementById('promptOutput')
  const section = document.getElementById('outputSection')
  if (!output || !section) return
  output.textContent = prompt
  section.classList.add('is-visible')
  section.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const copyPrompt = async (): Promise<void> => {
  const output = document.getElementById('promptOutput')
  if (!output) return
  const text = output.textContent || ''
  try {
    await navigator.clipboard.writeText(text)
    showNotification('Copied prompt to clipboard!')
  } catch (error) {
    showNotification('Unable to copy. Select the text and copy manually.')
    console.error(error)
  }
}

const handleActionClick = (event: MouseEvent): void => {
  const target = event.target as HTMLElement
  const actionButton = target.closest<HTMLButtonElement>('button[data-action]')
  if (!actionButton) return

  const action = actionButton.dataset.action
  if (!action) return

  switch (action) {
    case 'add-entity': {
      const list = document.getElementById('entitiesList')
      if (!list) return
      list.appendChild(createEntityItem())
      break
    }
    case 'add-relationship': {
      const list = document.getElementById('relationshipsList')
      if (!list) return
      list.appendChild(createRelationshipItem())
      break
    }
    case 'add-property': {
      const entityId = actionButton.dataset.entityId
      if (!entityId) return
      const list = document.querySelector<HTMLDivElement>(`.sub-item-list[data-entity-id="${entityId}"]`)
      if (!list) return
      list.appendChild(createPropertyRow())
      break
    }
    case 'remove-item': {
      const item = actionButton.closest<HTMLElement>('.dynamic-item')
      if (item) item.remove()
      break
    }
    case 'remove-property': {
      const item = actionButton.closest<HTMLElement>('.sub-item')
      if (item) item.remove()
      break
    }
    case 'use-defaults': {
      setDefaults()
      break
    }
    case 'generate': {
      generatePrompt()
      break
    }
    case 'copy': {
      void copyPrompt()
      break
    }
    default:
      break
  }
}

export const initApp = (): void => {
  if (!appRoot) return
  appRoot.innerHTML = appTemplate

  const entitiesList = document.getElementById('entitiesList')
  const relationshipsList = document.getElementById('relationshipsList')
  if (!entitiesList || !relationshipsList) return

  entitiesList.appendChild(createEntityItem())
  relationshipsList.appendChild(createRelationshipItem())

  document.addEventListener('click', handleActionClick)
}
