import './style.css'
import './theme-preview.css'

type Mode = 'light' | 'dark'

type ThemeTokens = {
  label: string
  light: {
    primary: string
    secondary: string
    accent: string
    ink: string
    surface: string
    surface2: string
    codeBg: string
    codeFg: string
  }
  dark: {
    primary: string
    secondary: string
    accent: string
    ink: string
    surface: string
    surface2: string
    codeBg: string
    codeFg: string
  }
}

const THEMES: Record<string, ThemeTokens> = {
  scholarlyBlue: {
    label: 'Scholarly Blue + Ink',
    light: {
      primary: '#2E5AAC',
      secondary: '#1F3A5F',
      accent: '#8B6F3D',
      ink: '#1B2A3A',
      surface: 'rgba(255,255,255,0.94)',
      surface2: 'rgba(255,255,255,0.82)',
      codeBg: '#0F172A',
      codeFg: '#E6ECF2',
    },
    dark: {
      primary: '#5E8BEB',
      secondary: '#2E5AAC',
      accent: '#C2A26E',
      ink: '#E6ECF2',
      surface: 'rgba(18, 27, 44, 0.88)',
      surface2: 'rgba(24, 36, 57, 0.86)',
      codeBg: '#07111F',
      codeFg: '#E6ECF2',
    },
  },
  libraryGreen: {
    label: 'Library Green + Parchment',
    light: {
      primary: '#2E6B5B',
      secondary: '#1E4E43',
      accent: '#B07A3A',
      ink: '#222A28',
      surface: 'rgba(255,255,255,0.92)',
      surface2: 'rgba(255,255,255,0.80)',
      codeBg: '#0B1512',
      codeFg: '#E7EEE9',
    },
    dark: {
      primary: '#4FA38D',
      secondary: '#2E6B5B',
      accent: '#D2A068',
      ink: '#E7EEE9',
      surface: 'rgba(16, 24, 19, 0.90)',
      surface2: 'rgba(22, 35, 28, 0.86)',
      codeBg: '#07110D',
      codeFg: '#E7EEE9',
    },
  },
  slateOxford: {
    label: 'Slate + Oxford',
    light: {
      primary: '#1F3A5F',
      secondary: '#2E4A74',
      accent: '#64748B',
      ink: '#111827',
      surface: 'rgba(255,255,255,0.92)',
      surface2: 'rgba(255,255,255,0.80)',
      codeBg: '#0B1220',
      codeFg: '#E3E8EF',
    },
    dark: {
      primary: '#4C6C9B',
      secondary: '#2A3E5F',
      accent: '#98A1B1',
      ink: '#E3E8EF',
      surface: 'rgba(15, 20, 27, 0.92)',
      surface2: 'rgba(25, 34, 48, 0.88)',
      codeBg: '#070B12',
      codeFg: '#E3E8EF',
    },
  },
  burgundyStone: {
    label: 'Burgundy + Stone',
    light: {
      primary: '#7A2E2E',
      secondary: '#4D2A2A',
      accent: '#C2A46B',
      ink: '#231A1A',
      surface: 'rgba(255,255,255,0.92)',
      surface2: 'rgba(255,255,255,0.80)',
      codeBg: '#140C0C',
      codeFg: '#EFE7E6',
    },
    dark: {
      primary: '#A35C5C',
      secondary: '#7A2E2E',
      accent: '#D7BD84',
      ink: '#EFE7E6',
      surface: 'rgba(19, 13, 13, 0.92)',
      surface2: 'rgba(28, 18, 18, 0.88)',
      codeBg: '#0D0707',
      codeFg: '#EFE7E6',
    },
  },
  indigoSage: {
    label: 'Indigo + Sage',
    light: {
      primary: '#384C7F',
      secondary: '#263A66',
      accent: '#6C8A6C',
      ink: '#182033',
      surface: 'rgba(255,255,255,0.92)',
      surface2: 'rgba(255,255,255,0.80)',
      codeBg: '#0D1322',
      codeFg: '#E7EBF2',
    },
    dark: {
      primary: '#6A86C7',
      secondary: '#384C7F',
      accent: '#8FB08F',
      ink: '#E7EBF2',
      surface: 'rgba(14, 18, 26, 0.92)',
      surface2: 'rgba(26, 33, 48, 0.88)',
      codeBg: '#070A12',
      codeFg: '#E7EBF2',
    },
  },
}

const STORAGE_KEYS = {
  theme: 'tp-theme',
  mode: 'tp-mode',
} as const

const byId = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Missing element #${id}`)
  return el as T
}

const getInitialThemeKey = (): string => {
  const saved = window.localStorage.getItem(STORAGE_KEYS.theme)
  if (saved && THEMES[saved]) return saved
  return 'scholarlyBlue'
}

const getInitialMode = (): Mode => {
  const saved = window.localStorage.getItem(STORAGE_KEYS.mode)
  if (saved === 'light' || saved === 'dark') return saved
  return 'light'
}

const applyTheme = (themeKey: string, mode: Mode): void => {
  const theme = THEMES[themeKey]
  if (!theme) return
  const t = theme[mode]

  // Tailwind v4 theme tokens are CSS variables; overriding them updates utilities like `text-primary`.
  const root = document.documentElement
  root.style.setProperty('--color-primary', t.primary)
  root.style.setProperty('--color-secondary', t.secondary)
  root.style.setProperty('--color-accent', t.accent)
  root.style.setProperty('--color-ink', t.ink)

  // Preview-specific neutrals.
  root.style.setProperty('--tp-ink', t.ink)
  root.style.setProperty('--tp-surface', t.surface)
  root.style.setProperty('--tp-surface-2', t.surface2)
  root.style.setProperty('--tp-code-bg', t.codeBg)
  root.style.setProperty('--tp-code-fg', t.codeFg)

  root.setAttribute('data-mode', mode)
  window.localStorage.setItem(STORAGE_KEYS.theme, themeKey)
  window.localStorage.setItem(STORAGE_KEYS.mode, mode)
}

const render = (): void => {
  const root = document.querySelector<HTMLDivElement>('#app')
  if (!root) throw new Error('Missing #app')

  const themeOptions = Object.entries(THEMES)
    .map(([key, t]) => `<option value="${key}">${t.label}</option>`)
    .join('')

  root.innerHTML = `
    <div class="tp-shell">
      <header class="tp-header">
        <h1 class="tp-title">Theme Preview</h1>
        <p class="tp-subtitle">
          Pick a palette and toggle light/dark. This page uses the same <code>--color-*</code> tokens as the app,
          so gradients, focus rings, and button treatments match what you'll get after a swap.
        </p>
      </header>

      <div class="tp-body">
        <div class="tp-grid">
          <aside class="tp-panel">
            <h2>Controls</h2>
            <div class="tp-row">
              <div>
                <label class="tp-label" for="themeSelect">Palette</label>
                <select id="themeSelect" class="tp-control">${themeOptions}</select>
              </div>
              <div>
                <label class="tp-label" for="modeSelect">Mode</label>
                <select id="modeSelect" class="tp-control">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div>
                <div class="tp-label">Swatches</div>
                <div class="tp-chiprow" aria-label="Theme swatches">
                  <span class="tp-chip"><span class="tp-dot primary"></span>Primary</span>
                  <span class="tp-chip"><span class="tp-dot secondary"></span>Secondary</span>
                  <span class="tp-chip"><span class="tp-dot accent"></span>Accent</span>
                  <span class="tp-chip"><span class="tp-dot ink"></span>Ink</span>
                </div>
                <div class="tp-footerhint">
                  Tip: open this in two tabs to compare palettes side-by-side.
                </div>
              </div>
            </div>
          </aside>

          <main class="tp-panel">
            <h2>Render</h2>

            <section class="tp-card" aria-label="Hero card">
              <h3>Domain & Objectives</h3>
              <p>Academic tone, clear hierarchy, low-noise UI. These colors should read as “credible” and “calm”.</p>
              <div class="tp-divider"></div>

              <div class="tp-form cols-2">
                <div>
                  <label class="tp-label" for="domainName">Domain Name *</label>
                  <input id="domainName" class="tp-input" placeholder="Financial Audit" value="Financial Audit" />
                </div>
                <div>
                  <label class="tp-label" for="preset">LLM Preset</label>
                  <select id="preset" class="tp-control">
                    <option>Universal</option>
                    <option>OpenAI</option>
                    <option>Gemini</option>
                    <option>Qwen</option>
                  </select>
                </div>
              </div>

              <div style="margin-top: 12px">
                <label class="tp-label" for="goal">Extraction Goal *</label>
                <textarea id="goal" class="tp-textarea" placeholder="Extract findings, parties, and outcomes.">Extract audit findings, parties, and outcomes.</textarea>
              </div>

              <div style="margin-top: 14px" class="tp-alert">
                Validation example: use accent for informative callouts (not “error red”) so the page stays calm.
              </div>

              <div class="tp-divider"></div>

              <div class="tp-actions">
                <button type="button" class="tp-btn outline">Add Entity Class</button>
                <button type="button" class="tp-btn primary">Generate Prompt</button>
                <button type="button" class="tp-btn ghost">Export JSON</button>
              </div>
            </section>

            <div style="height: 14px"></div>

            <section class="tp-card" aria-label="Output card">
              <h3>Output Preview</h3>
              <p>Check contrast and “authority”: dark surfaces should still feel academic, not gaming/clubby.</p>
              <div class="tp-divider"></div>
              <pre class="tp-code"><code>{
  "domain": "Financial Audit",
  "entities": ["Company", "AuditFinding", "Regulator"],
  "relationships": ["REPORTS_TO", "HAS_FINDING"],
  "constraints": ["Company must have at least one Headquarters."]
}</code></pre>
            </section>
          </main>
        </div>
      </div>
    </div>
  `

  const themeSelect = byId<HTMLSelectElement>('themeSelect')
  const modeSelect = byId<HTMLSelectElement>('modeSelect')

  const initialThemeKey = getInitialThemeKey()
  const initialMode = getInitialMode()

  themeSelect.value = initialThemeKey
  modeSelect.value = initialMode
  applyTheme(initialThemeKey, initialMode)

  themeSelect.addEventListener('change', () => {
    applyTheme(themeSelect.value, modeSelect.value as Mode)
  })
  modeSelect.addEventListener('change', () => {
    applyTheme(themeSelect.value, modeSelect.value as Mode)
  })
}

render()

