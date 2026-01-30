# Knowledge Graph Prompt Generator

A small web app for building deterministic, high-precision knowledge-graph extraction prompts. Built with Vite + TypeScript (vanilla) and designed to keep the output stable across runs by sorting entities, relationships, and properties by name.

## Features
- Structured form for domains, entities, properties, relationships, and rules
- Deterministic prompt output (sorted, normalized)
- Case-insensitive validation with canonicalized names
- Copy-to-clipboard output panel
- Pure TypeScript modules (no framework)
- Tailwind CSS v4 for styling
- Autosave to localStorage with schema versioning + migrations
- JSON import/export for configs

## Getting started
```bash
cd web
npm install
npm run dev
```

## Tests
```bash
cd web
npm test
```

## Build
```bash
cd web
npm run build
npm run preview
```

## GitHub Pages
This repo includes a GitHub Actions workflow that builds the app from `web/` and deploys `web/dist` to GitHub Pages. Make sure Pages is set to use **GitHub Actions** in your repo settings.

## Project structure
```
web/
  index.html
  src/
    app.ts         # UI bootstrap
    ui.ts          # UI + event handling
    validation.ts  # validation + summary UI
    state.ts       # state, migrations, persistence
    prompt.ts      # deterministic prompt builder
    types.ts       # data model types
    main.ts        # app entry point
    style.css
```

## Notes
- Determinism is achieved by sorting entity/relationship/property lists by name before rendering the prompt.
- The original single-file prototype remains at the repo root as `index.html`.
- Saved configs include a `schemaVersion` field and are migrated on load/import.
