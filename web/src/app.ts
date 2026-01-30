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

const inputClass =
  'w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
const labelClass = 'mb-2 block text-sm font-semibold text-slate-600'
const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition'
const buttonOutline = `${buttonBase} border-2 border-primary text-primary hover:border-secondary hover:text-secondary`
const buttonPrimary = `${buttonBase} bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/30`
const buttonRemove = 'rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-200'
const buttonGhost = `${buttonBase} border border-slate-200 text-slate-600 hover:border-primary hover:text-primary`

const appTemplate = `
  <div id="notification" class="hidden fixed right-8 top-8 z-50 rounded-xl bg-emerald-600 px-8 py-4 text-white shadow-lg" role="status" aria-live="polite"></div>
  <div class="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-white/95 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.3)] backdrop-blur">
    <header class="bg-gradient-to-br from-primary to-secondary px-10 py-14 text-center text-white">
      <h1 class="text-3xl font-extrabold tracking-tight md:text-4xl">🧠 Advanced KG Prompt Generator</h1>
      <p class="mt-3 text-lg/relaxed text-white/90">Design multi-layered Ontologies and generate high-precision Extraction Prompts</p>
    </header>

    <form id="kgForm" class="p-10" novalidate>
      <section class="mb-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div class="mb-6 flex items-center gap-4 text-2xl font-bold text-primary">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">1</span>
          Domain & Objectives
        </div>
        <div class="mb-5">
          <label for="domainName" class="${labelClass}">Domain Name *</label>
          <input type="text" id="domainName" required placeholder="e.g., Financial Audit, Medical Research" class="${inputClass}" data-field="domain" />
          <div class="mt-2 hidden text-xs text-red-600" data-error="domain"></div>
        </div>
        <div>
          <label for="primaryGoal" class="${labelClass}">Extraction Goal *</label>
          <textarea
            id="primaryGoal"
            required
            placeholder="e.g., Build a treatment-disease mapping with clinical outcome metrics..."
            class="${inputClass} min-h-[120px] resize-y"
            data-field="goal"
          ></textarea>
          <div class="mt-2 hidden text-xs text-red-600" data-error="goal"></div>
        </div>
      </section>

      <div id="validationSummary" class="mb-8 hidden rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"></div>

      <section class="mb-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div class="mb-6 flex items-center gap-4 text-2xl font-bold text-primary">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">2</span>
          Class Hierarchy (Entity Types)
        </div>
        <p class="mb-5 text-sm text-slate-500">
          Define your entities. Use <strong>Parent Class</strong> to create hierarchies (e.g., a "Surgeon" is a type of "Doctor").
        </p>
        <div id="entitiesList" class="dynamic-list mt-4"></div>
        <button type="button" class="${buttonOutline}" data-action="add-entity">+ Add Entity Class</button>
      </section>

      <section class="mb-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div class="mb-6 flex items-center gap-4 text-2xl font-bold text-primary">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">3</span>
          Relationship Predicates
        </div>
        <div id="relationshipsList" class="dynamic-list mt-4"></div>
        <button type="button" class="${buttonOutline}" data-action="add-relationship">+ Add Relationship Type</button>
      </section>

      <section class="mb-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div class="mb-6 flex items-center gap-4 text-2xl font-bold text-primary">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">4</span>
          Global Ontology Rules
        </div>
        <div class="mb-5">
          <label for="inferenceRules" class="${labelClass}">Inference Rules (One per line)</label>
          <textarea
            id="inferenceRules"
            placeholder="e.g., If X is BORN_IN Y, then X LIVES_IN Y (implied)\nIf X PART_OF Y and Y PART_OF Z, then X PART_OF Z (transitive)"
            class="${inputClass} min-h-[120px] resize-y"
            data-field="inference"
          ></textarea>
          <div class="mt-2 text-xs text-slate-500">Define logic that the LLM should use to infer "hidden" relationships.</div>
        </div>
        <div>
          <label for="globalConstraints" class="${labelClass}">Global Constraints</label>
          <textarea
            id="globalConstraints"
            placeholder="e.g., A 'Person' can have at most one 'BirthDate'\nA 'Company' must have at least one 'Headquarters'"
            class="${inputClass} min-h-[120px] resize-y"
            data-field="constraints"
          ></textarea>
        </div>
      </section>

      <div class="flex flex-col items-center justify-center gap-4 pb-10 md:flex-row md:flex-wrap">
        <button type="button" class="${buttonOutline} px-10 py-4 text-base md:text-lg" data-action="use-defaults">
          📝 Use Default Values
        </button>
        <button type="button" class="${buttonPrimary} px-12 py-4 text-base md:text-lg disabled:cursor-not-allowed disabled:opacity-50" data-action="generate" data-generate>
          ✨ Generate Professional Prompt
        </button>
        <button type="button" class="${buttonGhost} px-8 py-3 text-sm" data-action="export-json">
          ⤓ Export JSON
        </button>
        <button type="button" class="${buttonGhost} px-8 py-3 text-sm" data-action="import-json">
          ⇪ Import JSON
        </button>
        <input type="file" id="jsonImport" accept="application/json" class="hidden" />
      </div>
    </form>

    <section id="outputSection" class="hidden rounded-2xl bg-slate-900 p-10" aria-live="polite">
      <div class="mb-6 flex flex-col gap-4 text-white md:flex-row md:items-center md:justify-between">
        <h2 class="text-2xl font-semibold">🚀 Optimized System Prompt</h2>
        <button class="${buttonOutline} border-white text-white hover:border-white/70 hover:text-white/80" data-action="copy">📋 Copy to Clipboard</button>
      </div>
      <div id="promptOutput" class="max-h-[700px] overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 p-6 font-mono text-sm leading-relaxed text-slate-100"></div>
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

let state: FormDataModel = {
  domain: '',
  goal: '',
  entities: [],
  relationships: [],
  inference: '',
  constraints: '',
}

const STORAGE_KEY = 'kg-prompt-generator:v1'
const SCHEMA_VERSION = 1
let saveTimer: number | undefined

const scheduleSave = (): void => {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION }))
    } catch (error) {
      console.warn('Unable to save state', error)
    }
  }, 250)
}

type VersionedState = FormDataModel & { schemaVersion?: number }

const migrateState = (data: VersionedState): FormDataModel => {
  const version = data.schemaVersion ?? 0
  if (version === SCHEMA_VERSION) return data

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

const loadSavedState = (): FormDataModel | null => {
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

const showNotification = (message: string): void => {
  const nav = document.getElementById('notification')
  if (!nav) return
  nav.textContent = message
  nav.classList.remove('hidden')
  window.setTimeout(() => {
    nav.classList.add('hidden')
  }, 3000)
}

const createEmptyProperty = (): PropertyDef => ({
  id: createId(),
  name: '',
  type: 'string',
  constraint: 'optional',
})

const createEmptyEntity = (): EntityDef => ({
  id: createId(),
  name: '',
  parent: '',
  desc: '',
  properties: [createEmptyProperty()],
})

const createEmptyRelationship = (): RelationshipDef => ({
  id: createId(),
  name: '',
  source: '',
  target: '',
  props: '',
})

const createPropertyRow = (data: PropertyDef): HTMLDivElement => {
  const row = document.createElement('div')
  row.className = 'sub-item grid gap-3 md:grid-cols-[2fr_1.5fr_1.5fr_auto] md:items-end'
  row.dataset.propId = data.id
  row.innerHTML = `
    <div>
      <input type="text" class="prop-name ${inputClass}" placeholder="Prop Name (e.g., age)" value="${data.name}" data-field="prop-name" />
    </div>
    <div>
      <select class="prop-type ${inputClass}" data-field="prop-type">
        <option value="string">String</option>
        <option value="number">Number</option>
        <option value="date">Date</option>
        <option value="boolean">Boolean</option>
      </select>
    </div>
    <div>
      <select class="prop-constraint ${inputClass}" data-field="prop-constraint">
        <option value="optional">Optional</option>
        <option value="required">Required</option>
        <option value="unique">Unique</option>
      </select>
    </div>
    <button type="button" class="${buttonRemove}" data-action="remove-property">×</button>
  `

  row.querySelector<HTMLSelectElement>('.prop-type')!.value = data.type
  row.querySelector<HTMLSelectElement>('.prop-constraint')!.value = data.constraint

  return row
}

const createEntityItem = (data: EntityDef): HTMLDivElement => {
  const div = document.createElement('div')
  div.className =
    'dynamic-item entity-item relative mb-5 rounded-xl border border-slate-200 bg-slate-50 p-6 transition hover:border-primary'
  div.dataset.entityId = data.id
  div.innerHTML = `
    <button type="button" class="${buttonRemove} absolute right-4 top-4" data-action="remove-entity">Remove</button>
    <div class="grid gap-5 md:grid-cols-2">
      <div>
        <label class="${labelClass}">Class Name</label>
        <input type="text" class="entity-name ${inputClass}" placeholder="e.g., Professor" value="${data.name}" data-field="entity-name" />
        <div class="mt-2 hidden text-xs text-red-600" data-error="entity-name"></div>
      </div>
      <div>
        <label class="${labelClass}">Parent Class (Optional)</label>
        <input type="text" class="entity-parent ${inputClass}" placeholder="e.g., Person" value="${data.parent}" data-field="entity-parent" />
      </div>
    </div>
    <div class="mt-5">
      <label class="${labelClass}">Description</label>
      <textarea class="entity-desc ${inputClass} min-h-[80px] resize-y" rows="2" placeholder="What does this class represent?" data-field="entity-desc">${data.desc}</textarea>
    </div>
    <div class="mt-5">
      <label class="${labelClass}">Properties (Attributes)</label>
      <div class="sub-item-list mt-3 border-l-2 border-slate-200 pl-4" data-entity-id="${data.id}"></div>
      <button type="button" class="${buttonOutline} mt-3 px-3 py-2 text-xs" data-action="add-property" data-entity-id="${data.id}">
        + Add Property
      </button>
    </div>
  `

  const propList = div.querySelector<HTMLDivElement>('.sub-item-list')
  if (propList) {
    data.properties.forEach((prop) => propList.appendChild(createPropertyRow(prop)))
  }

  return div
}

const createRelationshipItem = (data: RelationshipDef): HTMLDivElement => {
  const div = document.createElement('div')
  div.className =
    'dynamic-item relationship-item relative mb-5 rounded-xl border border-slate-200 bg-slate-50 p-6 transition hover:border-primary'
  div.dataset.relationshipId = data.id
  div.innerHTML = `
    <button type="button" class="${buttonRemove} absolute right-4 top-4" data-action="remove-relationship">Remove</button>
    <div>
      <label class="${labelClass}">Predicate Name (Relationship)</label>
      <input type="text" class="rel-name ${inputClass}" placeholder="e.g., GRADUATED_FROM" value="${data.name}" data-field="rel-name" />
      <div class="mt-2 hidden text-xs text-red-600" data-error="rel-name"></div>
    </div>
    <div class="mt-5 grid gap-5 md:grid-cols-2">
      <div>
        <label class="${labelClass}">Source Class</label>
        <input type="text" class="rel-source ${inputClass}" placeholder="e.g., Person" value="${data.source}" data-field="rel-source" />
        <div class="mt-2 hidden text-xs text-red-600" data-error="rel-source"></div>
      </div>
      <div>
        <label class="${labelClass}">Target Class</label>
        <input type="text" class="rel-target ${inputClass}" placeholder="e.g., University" value="${data.target}" data-field="rel-target" />
        <div class="mt-2 hidden text-xs text-red-600" data-error="rel-target"></div>
      </div>
    </div>
    <div class="mt-5">
      <label class="${labelClass}">Properties for this Edge</label>
      <input type="text" class="rel-props ${inputClass}" placeholder="e.g., year, degree_type (comma separated)" value="${data.props}" data-field="rel-props" />
    </div>
  `

  return div
}

const renderEntities = (): void => {
  const list = document.getElementById('entitiesList')
  if (!list) return
  list.innerHTML = ''
  state.entities.forEach((entity) => list.appendChild(createEntityItem(entity)))
}

const renderRelationships = (): void => {
  const list = document.getElementById('relationshipsList')
  if (!list) return
  list.innerHTML = ''
  state.relationships.forEach((rel) => list.appendChild(createRelationshipItem(rel)))
}

const syncStateFromDOM = (): void => {
  state = collectFormData()
  scheduleSave()
}

const collectFormData = (): FormDataModel => {
  const domain = (document.getElementById('domainName') as HTMLInputElement).value
  const goal = (document.getElementById('primaryGoal') as HTMLTextAreaElement).value
  const inference = (document.getElementById('inferenceRules') as HTMLTextAreaElement).value
  const constraints = (document.getElementById('globalConstraints') as HTMLTextAreaElement).value

  const entities: EntityDef[] = Array.from(
    document.querySelectorAll<HTMLDivElement>('#entitiesList .entity-item')
  ).map((item) => {
    const entityId = item.dataset.entityId || createId()
    const properties = Array.from(item.querySelectorAll<HTMLDivElement>('.sub-item')).map((p) => ({
      id: p.dataset.propId || createId(),
      name: p.querySelector<HTMLInputElement>('.prop-name')?.value ?? '',
      type: p.querySelector<HTMLSelectElement>('.prop-type')?.value ?? 'string',
      constraint: (p.querySelector<HTMLSelectElement>('.prop-constraint')?.value ?? 'optional') as
        | 'optional'
        | 'required'
        | 'unique',
    }))

    return {
      id: entityId,
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
  state = {
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
        constraint: prop.constraint,
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
  }

  renderAll()

  showNotification('✅ Form populated with default research values!')
  scheduleSave()
}

type ValidationErrors = {
  domain?: string
  goal?: string
  entityNames: Record<string, string>
  relationshipNames: Record<string, string>
  relationshipSources: Record<string, string>
  relationshipTargets: Record<string, string>
}

const normalizeName = (value: string): string => value.trim().toLowerCase()

const validateState = (data: FormDataModel): ValidationErrors => {
  const errors: ValidationErrors = {
    entityNames: {},
    relationshipNames: {},
    relationshipSources: {},
    relationshipTargets: {},
  }

  if (!data.domain.trim()) errors.domain = 'Domain name is required.'
  if (!data.goal.trim()) errors.goal = 'Extraction goal is required.'

  const entityNameMap = new Map<string, string>()
  data.entities.forEach((entity) => {
    const normalized = normalizeName(entity.name)
    if (!normalized) {
      errors.entityNames[entity.id] = 'Class name is required.'
      return
    }
    if (entityNameMap.has(normalized)) {
      errors.entityNames[entity.id] = 'Class name must be unique.'
    } else {
      entityNameMap.set(normalized, entity.id)
    }
  })

  const relationshipNameMap = new Map<string, string>()
  data.relationships.forEach((rel) => {
    const normalized = normalizeName(rel.name)
    if (!normalized) {
      errors.relationshipNames[rel.id] = 'Relationship name is required.'
    } else if (relationshipNameMap.has(normalized)) {
      errors.relationshipNames[rel.id] = 'Relationship name must be unique.'
    } else {
      relationshipNameMap.set(normalized, rel.id)
    }

    const sourceName = normalizeName(rel.source)
    const targetName = normalizeName(rel.target)

    if (!sourceName) {
      errors.relationshipSources[rel.id] = 'Source class is required.'
    } else if (!entityNameMap.has(sourceName)) {
      errors.relationshipSources[rel.id] = 'Source class must match a defined entity.'
    }

    if (!targetName) {
      errors.relationshipTargets[rel.id] = 'Target class is required.'
    } else if (!entityNameMap.has(targetName)) {
      errors.relationshipTargets[rel.id] = 'Target class must match a defined entity.'
    }
  })

  return errors
}

const clearErrors = (): void => {
  document.querySelectorAll('[data-error]').forEach((el) => {
    el.classList.add('hidden')
    el.textContent = ''
  })
  document
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      '.border-red-400'
    )
    .forEach((el) => {
      el.classList.remove('border-red-400')
      el.classList.add('border-slate-200')
    })
}

const setError = (field: HTMLElement | null, errorEl: HTMLElement | null, message: string): void => {
  if (!field || !errorEl) return
  field.classList.add('border-red-400')
  field.classList.remove('border-slate-200')
  errorEl.textContent = message
  errorEl.classList.remove('hidden')
}

const updateSummary = (messages: string[]): void => {
  const summary = document.getElementById('validationSummary')
  if (!summary) return
  if (messages.length === 0) {
    summary.classList.add('hidden')
    summary.textContent = ''
    return
  }
  summary.classList.remove('hidden')
  summary.textContent = `Please fix the following issues: ${messages.join(' ')}`
}

const applyErrors = (errors: ValidationErrors): boolean => {
  clearErrors()

  if (errors.domain) {
    setError(
      document.getElementById('domainName'),
      document.querySelector('[data-error="domain"]'),
      errors.domain
    )
  }
  if (errors.goal) {
    setError(
      document.getElementById('primaryGoal'),
      document.querySelector('[data-error="goal"]'),
      errors.goal
    )
  }

  document.querySelectorAll<HTMLDivElement>('.entity-item').forEach((item) => {
    const id = item.dataset.entityId
    if (!id) return
    const message = errors.entityNames[id]
    if (!message) return
    setError(
      item.querySelector('.entity-name'),
      item.querySelector('[data-error="entity-name"]'),
      message
    )
  })

  document.querySelectorAll<HTMLDivElement>('.relationship-item').forEach((item) => {
    const id = item.dataset.relationshipId
    if (!id) return

    const nameMessage = errors.relationshipNames[id]
    if (nameMessage) {
      setError(
        item.querySelector('.rel-name'),
        item.querySelector('[data-error="rel-name"]'),
        nameMessage
      )
    }

    const sourceMessage = errors.relationshipSources[id]
    if (sourceMessage) {
      setError(
        item.querySelector('.rel-source'),
        item.querySelector('[data-error="rel-source"]'),
        sourceMessage
      )
    }

    const targetMessage = errors.relationshipTargets[id]
    if (targetMessage) {
      setError(
        item.querySelector('.rel-target'),
        item.querySelector('[data-error="rel-target"]'),
        targetMessage
      )
    }
  })

  const summaryMessages: string[] = []
  if (errors.domain) summaryMessages.push(errors.domain)
  if (errors.goal) summaryMessages.push(errors.goal)
  if (Object.keys(errors.entityNames).length > 0) {
    summaryMessages.push('One or more entity names are missing or duplicated.')
  }
  if (Object.keys(errors.relationshipNames).length > 0) {
    summaryMessages.push('One or more relationship names are missing or duplicated.')
  }
  if (
    Object.keys(errors.relationshipSources).length > 0 ||
    Object.keys(errors.relationshipTargets).length > 0
  ) {
    summaryMessages.push('One or more relationships reference undefined classes.')
  }
  updateSummary(summaryMessages)

  const hasErrors =
    Boolean(errors.domain) ||
    Boolean(errors.goal) ||
    Object.keys(errors.entityNames).length > 0 ||
    Object.keys(errors.relationshipNames).length > 0 ||
    Object.keys(errors.relationshipSources).length > 0 ||
    Object.keys(errors.relationshipTargets).length > 0

  const generateButton = document.querySelector<HTMLButtonElement>('[data-generate]')
  if (generateButton) generateButton.disabled = hasErrors

  return !hasErrors
}

const renderAll = (): void => {
  renderEntities()
  renderRelationships()

  const domain = document.getElementById('domainName') as HTMLInputElement
  const goal = document.getElementById('primaryGoal') as HTMLTextAreaElement
  const inference = document.getElementById('inferenceRules') as HTMLTextAreaElement
  const constraints = document.getElementById('globalConstraints') as HTMLTextAreaElement

  if (domain) domain.value = state.domain
  if (goal) goal.value = state.goal
  if (inference) inference.value = state.inference
  if (constraints) constraints.value = state.constraints
}

const revalidate = (): void => {
  applyErrors(validateState(state))
}

const generatePrompt = (): void => {
  syncStateFromDOM()
  const isValid = applyErrors(validateState(state))
  if (!isValid) {
    showNotification('Please fix the highlighted errors before generating.')
    return
  }

  const prompt = buildPrompt(state)
  const output = document.getElementById('promptOutput')
  const section = document.getElementById('outputSection')
  if (!output || !section) return
  output.textContent = prompt
  section.classList.remove('hidden')
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

const updateStateFromInput = (target: HTMLElement): void => {
  const input = target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  const field = input.dataset.field
  if (!field) return

  if (field === 'domain') state.domain = input.value
  if (field === 'goal') state.goal = input.value
  if (field === 'inference') state.inference = input.value
  if (field === 'constraints') state.constraints = input.value

  const entityItem = input.closest<HTMLDivElement>('.entity-item')
  if (entityItem) {
    const entityId = entityItem.dataset.entityId
    if (!entityId) return
    const entity = state.entities.find((e) => e.id === entityId)
    if (!entity) return

    if (field === 'entity-name') entity.name = input.value
    if (field === 'entity-parent') entity.parent = input.value
    if (field === 'entity-desc') entity.desc = input.value

    const propItem = input.closest<HTMLDivElement>('.sub-item')
    if (propItem) {
      const propId = propItem.dataset.propId
      if (!propId) return
      const prop = entity.properties.find((p) => p.id === propId)
      if (!prop) return
      if (field === 'prop-name') prop.name = input.value
      if (field === 'prop-type') prop.type = input.value
      if (field === 'prop-constraint') prop.constraint = input.value as PropertyDef['constraint']
    }
  }

  const relItem = input.closest<HTMLDivElement>('.relationship-item')
  if (relItem) {
    const relId = relItem.dataset.relationshipId
    if (!relId) return
    const rel = state.relationships.find((r) => r.id === relId)
    if (!rel) return
    if (field === 'rel-name') rel.name = input.value
    if (field === 'rel-source') rel.source = input.value
    if (field === 'rel-target') rel.target = input.value
    if (field === 'rel-props') rel.props = input.value
  }
  scheduleSave()
}

const handleActionClick = (event: MouseEvent): void => {
  const target = event.target as HTMLElement
  const actionButton = target.closest<HTMLButtonElement>('button[data-action]')
  if (!actionButton) return

  const action = actionButton.dataset.action
  if (!action) return

  switch (action) {
    case 'add-entity': {
      syncStateFromDOM()
      state.entities = [...state.entities, createEmptyEntity()]
      renderEntities()
      revalidate()
      scheduleSave()
      break
    }
    case 'add-relationship': {
      syncStateFromDOM()
      state.relationships = [...state.relationships, createEmptyRelationship()]
      renderRelationships()
      revalidate()
      scheduleSave()
      break
    }
    case 'add-property': {
      syncStateFromDOM()
      const entityId = actionButton.dataset.entityId
      if (!entityId) return
      const entity = state.entities.find((e) => e.id === entityId)
      if (!entity) return
      entity.properties = [...entity.properties, createEmptyProperty()]
      renderEntities()
      revalidate()
      scheduleSave()
      break
    }
    case 'remove-entity': {
      syncStateFromDOM()
      const item = actionButton.closest<HTMLElement>('.entity-item')
      const id = item?.dataset.entityId
      if (!id) return
      state.entities = state.entities.filter((entity) => entity.id !== id)
      renderEntities()
      revalidate()
      scheduleSave()
      break
    }
    case 'remove-relationship': {
      syncStateFromDOM()
      const item = actionButton.closest<HTMLElement>('.relationship-item')
      const id = item?.dataset.relationshipId
      if (!id) return
      state.relationships = state.relationships.filter((rel) => rel.id !== id)
      renderRelationships()
      revalidate()
      scheduleSave()
      break
    }
    case 'remove-property': {
      syncStateFromDOM()
      const prop = actionButton.closest<HTMLElement>('.sub-item')
      const entityItem = actionButton.closest<HTMLElement>('.entity-item')
      const entityId = entityItem?.dataset.entityId
      const propId = prop?.dataset.propId
      if (!entityId || !propId) return
      const entity = state.entities.find((e) => e.id === entityId)
      if (!entity) return
      entity.properties = entity.properties.filter((p) => p.id !== propId)
      if (entity.properties.length === 0) entity.properties = [createEmptyProperty()]
      renderEntities()
      revalidate()
      scheduleSave()
      break
    }
    case 'use-defaults': {
      setDefaults()
      revalidate()
      break
    }
    case 'export-json': {
      syncStateFromDOM()
      const payload = JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION }, null, 2)
      const blob = new Blob([payload], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'kg-prompt-config.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      showNotification('Exported configuration JSON.')
      break
    }
    case 'import-json': {
      const input = document.getElementById('jsonImport') as HTMLInputElement | null
      if (input) input.click()
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

const handleInputChange = (event: Event): void => {
  const target = event.target as HTMLElement
  if (!target || !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return
  updateStateFromInput(target)
  revalidate()
}

const handleFileImport = (event: Event): void => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result)) as VersionedState
      state = migrateState(parsed)
      if (state.entities.length === 0) state.entities = [createEmptyEntity()]
      if (state.relationships.length === 0) state.relationships = [createEmptyRelationship()]
      renderAll()
      revalidate()
      scheduleSave()
      showNotification('Imported configuration JSON.')
    } catch (error) {
      showNotification('Invalid JSON file. Please check the format.')
      console.error(error)
    } finally {
      input.value = ''
    }
  }
  reader.readAsText(file)
}

export const initApp = (): void => {
  if (!appRoot) return
  appRoot.innerHTML = appTemplate

  const saved = loadSavedState()
  state =
    saved ?? {
      schemaVersion: SCHEMA_VERSION,
      domain: '',
      goal: '',
      entities: [createEmptyEntity()],
      relationships: [createEmptyRelationship()],
      inference: '',
      constraints: '',
    }

  renderAll()
  revalidate()

  document.addEventListener('click', handleActionClick)
  document.addEventListener('input', handleInputChange)
  document.addEventListener('change', handleInputChange)
  const importInput = document.getElementById('jsonImport')
  if (importInput) importInput.addEventListener('change', handleFileImport)
}
