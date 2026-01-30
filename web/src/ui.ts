import { buildPrompt } from './prompt'
import { byId } from './dom'
import {
  buildDefaultState,
  buildInitialState,
  createEmptyEntity,
  createEmptyProperty,
  createEmptyRelationship,
  createId,
  getState,
  initState,
  migrateState,
  scheduleSave,
  setState,
  SCHEMA_VERSION,
} from './state'
import { applyErrors, validateState } from './validation'
import type { FormDataModel, EntityDef, PropertyDef, RelationshipDef } from './types'

const inputClass =
  'w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
const labelClass = 'mb-2 block text-sm font-semibold text-slate-600'
const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition'
const buttonOutline = `${buttonBase} border-2 border-primary text-primary hover:border-secondary hover:text-secondary`
const buttonPrimary = `${buttonBase} bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/30`
const buttonRemove = 'rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-200'
const buttonGhost = `${buttonBase} border border-slate-200 text-slate-600 hover:border-primary hover:text-primary`

export const ACTIONS = {
  addEntity: 'add-entity',
  addRelationship: 'add-relationship',
  addProperty: 'add-property',
  removeEntity: 'remove-entity',
  removeRelationship: 'remove-relationship',
  removeProperty: 'remove-property',
  useDefaults: 'use-defaults',
  exportJson: 'export-json',
  importJson: 'import-json',
  generate: 'generate',
  copy: 'copy',
} as const

export type ActionName = (typeof ACTIONS)[keyof typeof ACTIONS]

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
        <p class="mb-5 text-xs text-slate-500">Example: “Financial Audit — extract audit findings, parties, and outcomes.”</p>
        <div class="mb-5">
          <label for="domainName" class="${labelClass}">Domain Name *</label>
          <input type="text" id="domainName" required placeholder="Financial Audit" class="${inputClass}" data-field="domain" />
          <div class="mt-2 hidden text-xs text-red-600" data-error="domain"></div>
        </div>
        <div>
          <label for="primaryGoal" class="${labelClass}">Extraction Goal *</label>
          <textarea
            id="primaryGoal"
            required
            placeholder="Extract audit findings, parties, and outcomes."
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
        <p class="mb-2 text-sm text-slate-500">
          Define your entities. Use <strong>Parent Class</strong> to create hierarchies.
        </p>
        <p class="mb-5 text-xs text-slate-500">Example: “Surgeon” → parent “Doctor”; properties: specialty (required).</p>
        <div id="entitiesList" class="dynamic-list mt-4"></div>
        <button type="button" class="${buttonOutline}" data-action="${ACTIONS.addEntity}">+ Add Entity Class</button>
      </section>

      <section class="mb-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div class="mb-6 flex items-center gap-4 text-2xl font-bold text-primary">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">3</span>
          Relationship Predicates
        </div>
        <p class="mb-2 text-xs text-slate-500">Example: PRESCRIBES (Doctor → Drug) with props: dosage, frequency.</p>
        <p class="mb-4 text-xs text-slate-500">Source/Target must match class names (case-insensitive).</p>
        <div id="relationshipsList" class="dynamic-list mt-4"></div>
        <button type="button" class="${buttonOutline}" data-action="${ACTIONS.addRelationship}">+ Add Relationship Type</button>
      </section>

      <section class="mb-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div class="mb-6 flex items-center gap-4 text-2xl font-bold text-primary">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">4</span>
          Global Ontology Rules
        </div>
        <p class="mb-5 text-xs text-slate-500">Example: “If X PART_OF Y and Y PART_OF Z, then X PART_OF Z.”</p>
        <div class="mb-5">
          <label for="inferenceRules" class="${labelClass}">Inference Rules (One per line)</label>
          <textarea
            id="inferenceRules"
            placeholder="If X PART_OF Y and Y PART_OF Z, then X PART_OF Z."
            class="${inputClass} min-h-[120px] resize-y"
            data-field="inference"
          ></textarea>
          <div class="mt-2 text-xs text-slate-500">Define logic that the LLM should use to infer "hidden" relationships.</div>
        </div>
        <div>
          <label for="globalConstraints" class="${labelClass}">Global Constraints</label>
          <textarea
            id="globalConstraints"
            placeholder="A Company must have at least one Headquarters."
            class="${inputClass} min-h-[120px] resize-y"
            data-field="constraints"
          ></textarea>
        </div>
      </section>

      <div class="flex flex-col items-center justify-center gap-4 pb-4 md:flex-row md:flex-wrap">
        <div class="flex flex-col items-center gap-1">
          <button type="button" class="${buttonOutline} px-10 py-4 text-base md:text-lg" data-action="${ACTIONS.useDefaults}">
            📝 Use Default Values
          </button>
          <span class="text-xs text-slate-500">Overwrites current form.</span>
        </div>
        <button type="button" class="${buttonPrimary} px-12 py-4 text-base md:text-lg disabled:cursor-not-allowed disabled:opacity-50" data-action="${ACTIONS.generate}" data-generate>
          ✨ Generate Professional Prompt
        </button>
        <button type="button" class="${buttonGhost} px-8 py-3 text-sm" data-action="${ACTIONS.exportJson}">
          ⤓ Export config JSON
        </button>
        <button type="button" class="${buttonGhost} px-8 py-3 text-sm" data-action="${ACTIONS.importJson}">
          ⇪ Import config JSON
        </button>
        <input type="file" id="jsonImport" accept="application/json" class="hidden" />
      </div>
      <p class="pb-10 text-center text-xs text-slate-500">Output is deterministic and sorted alphabetically.</p>
    </form>

    <section id="outputSection" class="hidden rounded-2xl bg-slate-900 p-10" aria-live="polite">
      <div class="mb-6 flex flex-col gap-4 text-white md:flex-row md:items-center md:justify-between">
        <h2 class="text-2xl font-semibold">🚀 Optimized System Prompt</h2>
        <button class="${buttonOutline} border-white text-white hover:border-white/70 hover:text-white/80" data-action="${ACTIONS.copy}">📋 Copy to Clipboard</button>
      </div>
      <p class="mb-4 text-xs text-slate-300">Model must output only JSON, no prose.</p>
      <div id="promptOutput" class="max-h-[700px] overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 p-6 font-mono text-sm leading-relaxed text-slate-100"></div>
    </section>
  </div>
`

const appRoot = document.querySelector<HTMLDivElement>('#app')

const showNotification = (message: string): void => {
  const nav = byId<HTMLDivElement>('notification')
  nav.textContent = message
  nav.classList.remove('hidden')
  window.setTimeout(() => {
    nav.classList.add('hidden')
  }, 3000)
}

const createPropertyRow = (data: PropertyDef): HTMLDivElement => {
  const row = document.createElement('div')
  row.className = 'sub-item grid gap-3 md:grid-cols-[2fr_1.5fr_1.5fr_auto] md:items-end'
  row.dataset.propId = data.id
  row.innerHTML = `
    <div>
      <input type="text" class="prop-name ${inputClass}" placeholder="age" value="${data.name}" data-field="prop-name" />
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
    <button type="button" class="${buttonRemove}" data-action="${ACTIONS.removeProperty}">×</button>
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
    <button type="button" class="${buttonRemove} absolute right-4 top-4" data-action="${ACTIONS.removeEntity}">Remove</button>
    <div class="grid gap-5 md:grid-cols-2">
      <div>
        <label class="${labelClass}">Class Name</label>
        <input type="text" class="entity-name ${inputClass}" placeholder="Professor" value="${data.name}" data-field="entity-name" />
        <div class="mt-2 hidden text-xs text-red-600" data-error="entity-name"></div>
      </div>
      <div>
        <label class="${labelClass}">Parent Class (Optional)</label>
        <input type="text" class="entity-parent ${inputClass}" placeholder="Person" value="${data.parent}" data-field="entity-parent" />
      </div>
    </div>
    <div class="mt-5">
      <label class="${labelClass}">Description</label>
      <textarea class="entity-desc ${inputClass} min-h-[80px] resize-y" rows="2" placeholder="Teaches or advises students." data-field="entity-desc">${data.desc}</textarea>
    </div>
    <div class="mt-5">
      <label class="${labelClass}">Properties (Attributes)</label>
      <div class="sub-item-list mt-3 border-l-2 border-slate-200 pl-4" data-entity-id="${data.id}"></div>
      <button type="button" class="${buttonOutline} mt-3 px-3 py-2 text-xs" data-action="${ACTIONS.addProperty}" data-entity-id="${data.id}">
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
    <button type="button" class="${buttonRemove} absolute right-4 top-4" data-action="${ACTIONS.removeRelationship}">Remove</button>
    <div>
      <label class="${labelClass}">Predicate Name (Relationship)</label>
      <input type="text" class="rel-name ${inputClass}" placeholder="GRADUATED_FROM" value="${data.name}" data-field="rel-name" />
      <div class="mt-2 hidden text-xs text-red-600" data-error="rel-name"></div>
    </div>
    <div class="mt-5 grid gap-5 md:grid-cols-2">
      <div>
        <label class="${labelClass}">Source Class</label>
        <input type="text" class="rel-source ${inputClass}" placeholder="Person" value="${data.source}" data-field="rel-source" />
        <div class="mt-2 hidden text-xs text-red-600" data-error="rel-source"></div>
      </div>
      <div>
        <label class="${labelClass}">Target Class</label>
        <input type="text" class="rel-target ${inputClass}" placeholder="University" value="${data.target}" data-field="rel-target" />
        <div class="mt-2 hidden text-xs text-red-600" data-error="rel-target"></div>
      </div>
    </div>
    <div class="mt-5">
      <label class="${labelClass}">Properties for this Edge</label>
      <input type="text" class="rel-props ${inputClass}" placeholder="year, degree_type" value="${data.props}" data-field="rel-props" />
    </div>
  `

  return div
}

const renderEntities = (): void => {
  const list = byId<HTMLDivElement>('entitiesList')
  list.innerHTML = ''
  getState().entities.forEach((entity) => list.appendChild(createEntityItem(entity)))
}

const renderRelationships = (): void => {
  const list = byId<HTMLDivElement>('relationshipsList')
  list.innerHTML = ''
  getState().relationships.forEach((rel) => list.appendChild(createRelationshipItem(rel)))
}

const renderAll = (): void => {
  renderEntities()
  renderRelationships()

  const data = getState()
  byId<HTMLInputElement>('domainName').value = data.domain
  byId<HTMLTextAreaElement>('primaryGoal').value = data.goal
  byId<HTMLTextAreaElement>('inferenceRules').value = data.inference
  byId<HTMLTextAreaElement>('globalConstraints').value = data.constraints
}

const collectFormData = (): FormDataModel => {
  const domain = byId<HTMLInputElement>('domainName').value
  const goal = byId<HTMLTextAreaElement>('primaryGoal').value
  const inference = byId<HTMLTextAreaElement>('inferenceRules').value
  const constraints = byId<HTMLTextAreaElement>('globalConstraints').value

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
    schemaVersion: SCHEMA_VERSION,
    domain,
    goal,
    entities,
    relationships,
    inference,
    constraints,
  }
}

const syncStateFromDOM = (): void => {
  const next = collectFormData()
  setState(next)
  scheduleSave(next)
}

const revalidate = (): void => {
  const data = getState()
  applyErrors(validateState(data), data)
}

const generatePrompt = (): void => {
  syncStateFromDOM()
  const data = getState()
  const isValid = applyErrors(validateState(data), data)
  if (!isValid) {
    showNotification('Please fix the highlighted errors before generating.')
    return
  }

  const prompt = buildPrompt(data)
  const output = byId<HTMLDivElement>('promptOutput')
  const section = byId<HTMLElement>('outputSection')
  output.textContent = prompt
  section.classList.remove('hidden')
  section.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const copyPrompt = async (): Promise<void> => {
  const output = byId<HTMLDivElement>('promptOutput')
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

  const data = getState()

  if (field === 'domain') data.domain = input.value
  if (field === 'goal') data.goal = input.value
  if (field === 'inference') data.inference = input.value
  if (field === 'constraints') data.constraints = input.value

  const entityItem = input.closest<HTMLDivElement>('.entity-item')
  if (entityItem) {
    const entityId = entityItem.dataset.entityId
    if (!entityId) return
    const entity = data.entities.find((e) => e.id === entityId)
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
    const rel = data.relationships.find((r) => r.id === relId)
    if (!rel) return
    if (field === 'rel-name') rel.name = input.value
    if (field === 'rel-source') rel.source = input.value
    if (field === 'rel-target') rel.target = input.value
    if (field === 'rel-props') rel.props = input.value
  }

  setState(data)
  scheduleSave(data)
}

const handleActionClick = (event: MouseEvent): void => {
  const target = event.target as HTMLElement
  const actionButton = target.closest<HTMLButtonElement>('button[data-action]')
  if (!actionButton) return

  const action = actionButton.dataset.action as ActionName | undefined
  if (!action) return

  switch (action) {
    case ACTIONS.addEntity: {
      syncStateFromDOM()
      const data = getState()
      data.entities = [...data.entities, createEmptyEntity()]
      setState(data)
      renderEntities()
      revalidate()
      scheduleSave(data)
      break
    }
    case ACTIONS.addRelationship: {
      syncStateFromDOM()
      const data = getState()
      data.relationships = [...data.relationships, createEmptyRelationship()]
      setState(data)
      renderRelationships()
      revalidate()
      scheduleSave(data)
      break
    }
    case ACTIONS.addProperty: {
      syncStateFromDOM()
      const entityId = actionButton.dataset.entityId
      if (!entityId) return
      const data = getState()
      const entity = data.entities.find((e) => e.id === entityId)
      if (!entity) return
      entity.properties = [...entity.properties, createEmptyProperty()]
      setState(data)
      renderEntities()
      revalidate()
      scheduleSave(data)
      break
    }
    case ACTIONS.removeEntity: {
      syncStateFromDOM()
      const item = actionButton.closest<HTMLElement>('.entity-item')
      const id = item?.dataset.entityId
      if (!id) return
      const data = getState()
      data.entities = data.entities.filter((entity) => entity.id !== id)
      setState(data)
      renderEntities()
      revalidate()
      scheduleSave(data)
      break
    }
    case ACTIONS.removeRelationship: {
      syncStateFromDOM()
      const item = actionButton.closest<HTMLElement>('.relationship-item')
      const id = item?.dataset.relationshipId
      if (!id) return
      const data = getState()
      data.relationships = data.relationships.filter((rel) => rel.id !== id)
      setState(data)
      renderRelationships()
      revalidate()
      scheduleSave(data)
      break
    }
    case ACTIONS.removeProperty: {
      syncStateFromDOM()
      const prop = actionButton.closest<HTMLElement>('.sub-item')
      const entityItem = actionButton.closest<HTMLElement>('.entity-item')
      const entityId = entityItem?.dataset.entityId
      const propId = prop?.dataset.propId
      if (!entityId || !propId) return
      const data = getState()
      const entity = data.entities.find((e) => e.id === entityId)
      if (!entity) return
      entity.properties = entity.properties.filter((p) => p.id !== propId)
      if (entity.properties.length === 0) entity.properties = [createEmptyProperty()]
      setState(data)
      renderEntities()
      revalidate()
      scheduleSave(data)
      break
    }
    case ACTIONS.useDefaults: {
      const data = buildDefaultState()
      setState(data)
      renderAll()
      showNotification('✅ Form populated with default research values!')
      revalidate()
      scheduleSave(data)
      break
    }
    case ACTIONS.exportJson: {
      syncStateFromDOM()
      const data = getState()
      const payload = JSON.stringify({ ...data, schemaVersion: SCHEMA_VERSION }, null, 2)
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
    case ACTIONS.importJson: {
      const input = byId<HTMLInputElement>('jsonImport')
      input.click()
      break
    }
    case ACTIONS.generate: {
      generatePrompt()
      break
    }
    case ACTIONS.copy: {
      void copyPrompt()
      break
    }
    default:
      break
  }
}

const handleInputChange = (event: Event): void => {
  const target = event.target as HTMLElement
  if (
    !target ||
    !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)
  ) {
    return
  }
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
      const parsed = JSON.parse(String(reader.result)) as FormDataModel
      let data = migrateState(parsed)
      if (data.entities.length === 0) data.entities = [createEmptyEntity()]
      if (data.relationships.length === 0) data.relationships = [createEmptyRelationship()]
      setState(data)
      renderAll()
      revalidate()
      scheduleSave(data)
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

  const saved = initState()
  setState(saved ?? buildInitialState())

  renderAll()
  revalidate()

  document.addEventListener('click', handleActionClick)
  document.addEventListener('input', handleInputChange)
  document.addEventListener('change', handleInputChange)
  const importInput = byId<HTMLInputElement>('jsonImport')
  importInput.addEventListener('change', handleFileImport)
}
