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
          <input type="text" id="domainName" required placeholder="e.g., Financial Audit, Medical Research" class="${inputClass}" />
        </div>
        <div>
          <label for="primaryGoal" class="${labelClass}">Extraction Goal *</label>
          <textarea
            id="primaryGoal"
            required
            placeholder="e.g., Build a treatment-disease mapping with clinical outcome metrics..."
            class="${inputClass} min-h-[120px] resize-y"
          ></textarea>
        </div>
      </section>

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
          ></textarea>
          <div class="mt-2 text-xs text-slate-500">Define logic that the LLM should use to infer "hidden" relationships.</div>
        </div>
        <div>
          <label for="globalConstraints" class="${labelClass}">Global Constraints</label>
          <textarea
            id="globalConstraints"
            placeholder="e.g., A 'Person' can have at most one 'BirthDate'\nA 'Company' must have at least one 'Headquarters'"
            class="${inputClass} min-h-[120px] resize-y"
          ></textarea>
        </div>
      </section>

      <div class="flex flex-col items-center justify-center gap-4 pb-10 md:flex-row">
        <button type="button" class="${buttonOutline} px-10 py-4 text-base md:text-lg" data-action="use-defaults">
          📝 Use Default Values
        </button>
        <button type="button" class="${buttonPrimary} px-12 py-4 text-base md:text-lg" data-action="generate">
          ✨ Generate Professional Prompt
        </button>
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

const showNotification = (message: string): void => {
  const nav = document.getElementById('notification')
  if (!nav) return
  nav.textContent = message
  nav.classList.remove('hidden')
  window.setTimeout(() => {
    nav.classList.add('hidden')
  }, 3000)
}

const createPropertyRow = (data?: Partial<PropertyDef>): HTMLDivElement => {
  const propId = createId()
  const row = document.createElement('div')
  row.className =
    'sub-item grid gap-3 md:grid-cols-[2fr_1.5fr_1.5fr_auto] md:items-end'
  row.dataset.propId = propId
  row.innerHTML = `
    <div>
      <input type="text" class="prop-name ${inputClass}" placeholder="Prop Name (e.g., age)" />
    </div>
    <div>
      <select class="prop-type ${inputClass}">
        <option value="string">String</option>
        <option value="number">Number</option>
        <option value="date">Date</option>
        <option value="boolean">Boolean</option>
      </select>
    </div>
    <div>
      <select class="prop-constraint ${inputClass}">
        <option value="optional">Optional</option>
        <option value="required">Required</option>
        <option value="unique">Unique</option>
      </select>
    </div>
    <button type="button" class="${buttonRemove}" data-action="remove-property">×</button>
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
  div.className =
    'dynamic-item entity-item relative mb-5 rounded-xl border border-slate-200 bg-slate-50 p-6 transition hover:border-primary'
  div.dataset.entityId = entityId
  div.innerHTML = `
    <button type="button" class="${buttonRemove} absolute right-4 top-4" data-action="remove-item">Remove</button>
    <div class="grid gap-5 md:grid-cols-2">
      <div>
        <label class="${labelClass}">Class Name</label>
        <input type="text" class="entity-name ${inputClass}" placeholder="e.g., Professor" />
      </div>
      <div>
        <label class="${labelClass}">Parent Class (Optional)</label>
        <input type="text" class="entity-parent ${inputClass}" placeholder="e.g., Person" />
      </div>
    </div>
    <div class="mt-5">
      <label class="${labelClass}">Description</label>
      <textarea class="entity-desc ${inputClass} min-h-[80px] resize-y" rows="2" placeholder="What does this class represent?"></textarea>
    </div>
    <div class="mt-5">
      <label class="${labelClass}">Properties (Attributes)</label>
      <div class="sub-item-list mt-3 border-l-2 border-slate-200 pl-4" data-entity-id="${entityId}"></div>
      <button type="button" class="${buttonOutline} mt-3 px-3 py-2 text-xs" data-action="add-property" data-entity-id="${entityId}">
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
  div.className =
    'dynamic-item relationship-item relative mb-5 rounded-xl border border-slate-200 bg-slate-50 p-6 transition hover:border-primary'
  div.dataset.relationshipId = relId
  div.innerHTML = `
    <button type="button" class="${buttonRemove} absolute right-4 top-4" data-action="remove-item">Remove</button>
    <div>
      <label class="${labelClass}">Predicate Name (Relationship)</label>
      <input type="text" class="rel-name ${inputClass}" placeholder="e.g., GRADUATED_FROM" />
    </div>
    <div class="mt-5 grid gap-5 md:grid-cols-2">
      <div>
        <label class="${labelClass}">Source Class</label>
        <input type="text" class="rel-source ${inputClass}" placeholder="e.g., Person" />
      </div>
      <div>
        <label class="${labelClass}">Target Class</label>
        <input type="text" class="rel-target ${inputClass}" placeholder="e.g., University" />
      </div>
    </div>
    <div class="mt-5">
      <label class="${labelClass}">Properties for this Edge</label>
      <input type="text" class="rel-props ${inputClass}" placeholder="e.g., year, degree_type (comma separated)" />
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
