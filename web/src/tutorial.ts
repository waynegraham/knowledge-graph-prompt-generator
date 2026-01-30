import './style.css'
import { buildDefaultState, loadSavedState } from './state'
import { buildPrompt } from './prompt'

const PROMPT_STORAGE_KEY = 'kg-prompt-generator:lastPrompt'

const hasMeaningfulData = (value: string | undefined | null): boolean => Boolean(value && value.trim().length > 0)

const hasProjectData = (state: ReturnType<typeof buildDefaultState> | null): boolean => {
  if (!state) return false
  if (hasMeaningfulData(state.domain) || hasMeaningfulData(state.goal)) return true
  if (state.entities.some((entity) => hasMeaningfulData(entity.name) || hasMeaningfulData(entity.desc))) return true
  if (state.relationships.some((rel) => hasMeaningfulData(rel.name))) return true
  return false
}

const summarizeList = (items: string[], fallback: string): string =>
  items.length > 0 ? items.join(', ') : fallback

const buildListHtml = (items: string[], emptyLabel: string): string => {
  if (items.length === 0) {
    return `<li class="text-sm text-slate-500">${emptyLabel}</li>`
  }
  return items
    .map((item) => `<li class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">${item}</li>`)
    .join('')
}

const getTutorialData = () => {
  const saved = loadSavedState()
  const usingSample = !hasProjectData(saved)
  const state = usingSample ? buildDefaultState() : (saved as ReturnType<typeof buildDefaultState>)
  const storedPrompt = localStorage.getItem(PROMPT_STORAGE_KEY)
  const prompt = storedPrompt ?? buildPrompt(state, { variant: 'universal', format: 'single' })

  const entities = state.entities.map((entity) => entity.name.trim()).filter(Boolean)
  const relationships = state.relationships.map((rel) => rel.name.trim()).filter(Boolean)
  const constraints = state.constraints
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return {
    usingSample,
    prompt,
    domain: state.domain || 'Sample Knowledge Domain',
    goal: state.goal || 'Define extraction goals for your domain.',
    entities,
    relationships,
    constraints,
  }
}

const template = (data: ReturnType<typeof getTutorialData>) => `
  <div class="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-white/95 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.3)] backdrop-blur">
    <header class="bg-gradient-to-br from-primary to-secondary px-10 py-12 text-white">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight md:text-4xl">🧭 Guided Project Walkthrough</h1>
          <p class="mt-3 text-sm text-white/85">
            A focused, step-by-step plan to turn your prompt into a working extraction project.
          </p>
        </div>
        <a
          class="rounded-full border border-white/70 px-5 py-2 text-sm font-semibold text-white/90 transition hover:border-white hover:text-white"
          href="index.html"
        >
          ← Back to Generator
        </a>
      </div>
    </header>

    <div class="p-10">
      ${
        data.usingSample
          ? `
        <div class="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-900">
          No saved project yet. Using the sample medical research prompt so you can see a complete walkthrough.
          Generate your own prompt on the main page to personalize this guide.
        </div>
      `
          : ''
      }

      <section class="mb-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div class="mb-4 flex items-center gap-4 text-2xl font-bold text-primary">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">1</span>
          Confirm the project scope
        </div>
        <p class="text-sm text-slate-600">Domain</p>
        <p class="mb-4 text-lg font-semibold text-slate-900">${data.domain}</p>
        <p class="text-sm text-slate-600">Extraction goal</p>
        <p class="text-base text-slate-800">${data.goal}</p>
      </section>

      <section class="mb-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div class="mb-4 flex items-center gap-4 text-2xl font-bold text-primary">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">2</span>
          Build the schema for your dataset
        </div>
        <p class="mb-4 text-sm text-slate-600">
          These are the entity classes and relationships your extraction pipeline will target.
        </p>
        <div class="grid gap-6 md:grid-cols-2">
          <div>
            <h3 class="text-sm font-semibold text-slate-700">Entities</h3>
            <ul class="mt-3 grid gap-2">${buildListHtml(data.entities, 'No entities yet — add at least one.')}</ul>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-slate-700">Relationships</h3>
            <ul class="mt-3 grid gap-2">${buildListHtml(data.relationships, 'No relationships yet — add at least one.')}</ul>
          </div>
        </div>
        <div class="mt-6 text-sm text-slate-600">
          Tip: Create a starter dataset with 5–10 documents that mention ${summarizeList(
            data.entities,
            'your target entities'
          )}.
        </div>
      </section>

      <section class="mb-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div class="mb-4 flex items-center gap-4 text-2xl font-bold text-primary">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">3</span>
          Run your first extraction
        </div>
        <p class="mb-4 text-sm text-slate-600">
          Paste this prompt into your model’s system (or developer) message and provide source text as the user input.
        </p>
        <div class="rounded-xl border border-slate-200 bg-slate-900 p-5 text-xs text-slate-100">
          <pre id="promptBlock" class="whitespace-pre-wrap font-mono"></pre>
        </div>
        <div class="mt-4 flex flex-wrap gap-3">
          <button
            id="copyPrompt"
            class="rounded-xl border-2 border-primary px-5 py-2 text-sm font-semibold text-primary transition hover:border-secondary hover:text-secondary"
            type="button"
          >
            📋 Copy prompt
          </button>
          <a
            class="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
            href="index.html"
          >
            Edit prompt
          </a>
        </div>
        <div class="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
          Sample run checklist: include the source citation, ask for JSON-only output, and verify each extracted
          ${summarizeList(data.relationships, 'relationship')} maps to your schema.
        </div>
      </section>

      <section class="mb-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div class="mb-4 flex items-center gap-4 text-2xl font-bold text-primary">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">4</span>
          Validate and iterate
        </div>
        <p class="mb-4 text-sm text-slate-600">
          Use these constraints to QA the output and refine the prompt as you discover edge cases.
        </p>
        <ul class="grid gap-2">
          ${
            data.constraints.length > 0
              ? data.constraints
                  .map(
                    (item) =>
                      `<li class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">${item}</li>`
                  )
                  .join('')
              : `<li class="text-sm text-slate-500">No constraints yet — add a few guardrails in the main generator.</li>`
          }
        </ul>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div class="mb-4 flex items-center gap-4 text-2xl font-bold text-primary">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">5</span>
          Share the project
        </div>
        <p class="text-sm text-slate-600">
          Export your config JSON so teammates can regenerate the same prompt, then document the schema in your repo’s README.
        </p>
      </section>
    </div>
  </div>
`

const render = () => {
  const root = document.querySelector<HTMLDivElement>('#app')
  if (!root) return
  const data = getTutorialData()
  root.innerHTML = template(data)
  const promptBlock = document.querySelector<HTMLPreElement>('#promptBlock')
  if (promptBlock) promptBlock.textContent = data.prompt

  const copyButton = document.querySelector<HTMLButtonElement>('#copyPrompt')
  copyButton?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(data.prompt)
      copyButton.textContent = '✅ Copied!'
      window.setTimeout(() => {
        copyButton.textContent = '📋 Copy prompt'
      }, 2000)
    } catch (error) {
      console.error(error)
      copyButton.textContent = 'Unable to copy'
    }
  })
}

render()
