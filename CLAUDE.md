# CLAUDE.md — Brief

This file provides guidance to Claude Code when working in this directory.

## Project Overview

**Brief** is a standalone Obsidian plugin for client workspace management.
Repo: `https://github.com/stephanteig/obsidian-brief`
Current version: `1.0.0`

Split out from `obsidian-dev-suite` — contains the workspace modules only.
Color tooling (Color Preview + Palette Extractor) lives in `obsidian-color-preview`.

## Tech Stack

- **Language:** TypeScript 4.7, compiled with esbuild
- **Runtime:** Obsidian Plugin API
- **Build:** `npm run build` → runs `tsc --noEmit` then `esbuild.config.mjs production`
- **Lint:** `npx eslint main.ts modules/**/*.ts` using `eslint-plugin-obsidianmd`

## Source Structure

```
obsidian-brief/
  main.ts                      — BriefPlugin entry, settings tab
  types.ts                     — BriefSettings, BriefPlugin type, helpers
  styles.css                   — All plugin CSS (no color-preview styles)
  manifest.json                — id: "brief", name: "Brief"
  esbuild.config.mjs / tsconfig.json / eslint.config.mjs / package.json
  modules/
    shared/
      dev-modal.ts             — BriefModal abstract base class (header/banner/steps/body/footer)
      client-switcher.ts       — ClientSwitcherModal (shared to avoid circular deps)
    client-context/index.ts    — Module 1: Client Context Switcher
    note-creator/index.ts      — Module 2: Smart Note Creator
    panel/index.ts             — Module 3: Brief side panel (ItemView)
```

## Deploy Workflow

```bash
npm run build
cp main.js "/Users/stephanteig/Library/Mobile Documents/iCloud~md~obsidian/Documents/Stephan MacbookPro/.obsidian/plugins/brief/main.js"
```

## Release Workflow

```bash
git add . && git commit -m "chore: bump version to X.Y.Z"
git push origin main
git tag X.Y.Z && git push origin X.Y.Z
# → GitHub Actions builds and attaches main.js, manifest.json, styles.css to the release
```

## Key Architecture Notes

### BriefPlugin type
`BriefPlugin` in `types.ts` is `Plugin & { settings: BriefSettings; saveSettings(): Promise<void>; refreshPanel?: () => void }`.
Modules receive `BriefPlugin` — they never import from `main.ts` to avoid circular deps.

### BriefModal base class
All modals extend `BriefModal` from `modules/shared/dev-modal.ts`.
Provides: header (icon + title), client banner (auto-shown when client active, has Switch button), step indicator, body, footer.
CSS: `.dev-modal` class on the modal element; `.dev-modal .modal-content` overridden in `styles.css`.

### Panel command dispatch
`BriefPanelView.cmd(id)` calls `(this.app as unknown as ObsidianInternal).commands?.executeCommandById(\`brief:\${id}\`)`.
Command IDs registered in modules use short form (e.g. `cc-switch-space`) — Obsidian auto-prefixes with `brief:`.

### Dashboard generation
`generateDashboardBlock()` in `panel/index.ts` — same algorithm as dev-suite.
Uses `<!-- brief:generated:start/end -->` markers (different from dev-suite's `<!-- dev:generated:start/end -->`).
Safe to regenerate: only replaces content between markers.

### Module toggles
`clientContext` and `noteCreator` are independently toggled in settings.
Panel always loads (no toggle — it's the UI shell).

## Obsidian ESLint Rules

Run `npx eslint main.ts modules/**/*.ts` before every push. Zero errors required.

- No `innerHTML`/`outerHTML` — use `createEl`, `createDiv`, `setIcon`
- No floating promises — use `void` or `.catch()`
- No `style.setProperty()` for static values — use CSS classes in `styles.css`
- Dynamic color assignments: use `element.style.background = color` (not `setProperty`)
- No plugin name in command names — Obsidian auto-prepends "Brief: " in the palette
- No `any` types — use `as unknown as InterfaceName` for internal Obsidian APIs
- No `detachLeavesOfType()` in `onunload()` — Obsidian manages leaf cleanup
- Sentence case for all UI text

## Vault Location

Plugin installed in:
```
/Users/stephanteig/Library/Mobile Documents/iCloud~md~obsidian/Documents/Stephan MacbookPro/.obsidian/plugins/brief/
```
