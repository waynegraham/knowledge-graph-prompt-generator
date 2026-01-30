import type { FormDataModel } from './types'
import { byId, qs, qsa } from './dom'

export type ValidationErrors = {
  domain?: string
  goal?: string
  entityNames: Record<string, string>
  relationshipNames: Record<string, string>
  relationshipSources: Record<string, string>
  relationshipTargets: Record<string, string>
}

const normalizeName = (value: string): string => value.trim().toLowerCase()

export const validateState = (data: FormDataModel): ValidationErrors => {
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
  qsa<HTMLElement>('[data-error]').forEach((el) => {
    el.classList.add('hidden')
    el.textContent = ''
  })
  document
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('.border-red-400')
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
  const summary = byId<HTMLDivElement>('validationSummary')
  if (messages.length === 0) {
    summary.classList.add('hidden')
    summary.innerHTML = ''
    return
  }
  summary.classList.remove('hidden')
  summary.innerHTML = `
    <div class="font-semibold">Fix these issues:</div>
    <ul class="mt-2 list-disc space-y-1 pl-5">
      ${messages.map((message) => `<li>${message}</li>`).join('')}
    </ul>
  `
}

export const applyErrors = (errors: ValidationErrors, data: FormDataModel): boolean => {
  clearErrors()

  if (errors.domain) {
    setError(byId<HTMLInputElement>('domainName'), qs<HTMLElement>('[data-error="domain"]'), errors.domain)
  }
  if (errors.goal) {
    setError(byId<HTMLTextAreaElement>('primaryGoal'), qs<HTMLElement>('[data-error="goal"]'), errors.goal)
  }

  qsa<HTMLDivElement>('.entity-item').forEach((item) => {
    const id = item.dataset.entityId
    if (!id) return
    const message = errors.entityNames[id]
    if (!message) return
    setError(item.querySelector('.entity-name'), item.querySelector('[data-error="entity-name"]'), message)
  })

  qsa<HTMLDivElement>('.relationship-item').forEach((item) => {
    const id = item.dataset.relationshipId
    if (!id) return

    const nameMessage = errors.relationshipNames[id]
    if (nameMessage) {
      setError(item.querySelector('.rel-name'), item.querySelector('[data-error="rel-name"]'), nameMessage)
    }

    const sourceMessage = errors.relationshipSources[id]
    if (sourceMessage) {
      setError(item.querySelector('.rel-source'), item.querySelector('[data-error="rel-source"]'), sourceMessage)
    }

    const targetMessage = errors.relationshipTargets[id]
    if (targetMessage) {
      setError(item.querySelector('.rel-target'), item.querySelector('[data-error="rel-target"]'), targetMessage)
    }
  })

  const summaryMessages: string[] = []
  if (errors.domain) summaryMessages.push('Missing domain name.')
  if (errors.goal) summaryMessages.push('Missing extraction goal.')
  if (Object.keys(errors.entityNames).length > 0) {
    const duplicates = new Set<string>()
    const counts = new Map<string, number>()
    data.entities.forEach((entity) => {
      const name = normalizeName(entity.name)
      if (!name) return
      counts.set(name, (counts.get(name) ?? 0) + 1)
    })
    counts.forEach((count, name) => {
      if (count > 1) duplicates.add(name)
    })
    if (duplicates.size > 0) {
      summaryMessages.push(`Duplicate entity names: ${[...duplicates].join(', ')}`)
    }
    if (
      Object.keys(errors.entityNames).some(
        (id) => !data.entities.find((entity) => entity.id === id)?.name.trim()
      )
    ) {
      summaryMessages.push('Missing entity names.')
    }
  }
  if (Object.keys(errors.relationshipNames).length > 0) {
    const duplicates = new Set<string>()
    const counts = new Map<string, number>()
    data.relationships.forEach((rel) => {
      const name = normalizeName(rel.name)
      if (!name) return
      counts.set(name, (counts.get(name) ?? 0) + 1)
    })
    counts.forEach((count, name) => {
      if (count > 1) duplicates.add(name)
    })
    if (duplicates.size > 0) {
      summaryMessages.push(`Duplicate relationship names: ${[...duplicates].join(', ')}`)
    }
    if (
      Object.keys(errors.relationshipNames).some(
        (id) => !data.relationships.find((rel) => rel.id === id)?.name.trim()
      )
    ) {
      summaryMessages.push('Missing relationship names.')
    }
  }
  if (Object.keys(errors.relationshipSources).length > 0) {
    summaryMessages.push('Missing or invalid relationship source classes.')
  }
  if (Object.keys(errors.relationshipTargets).length > 0) {
    summaryMessages.push('Missing or invalid relationship target classes.')
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
