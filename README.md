<div align="center">

[![GitHub release](https://img.shields.io/github/v/release/stephanteig/obsidian-brief?style=flat-square&color=4A90D9&labelColor=1a1a2e)](https://github.com/stephanteig/obsidian-brief/releases/latest)
[![License](https://img.shields.io/github/license/stephanteig/obsidian-brief?style=flat-square&color=27AE60&labelColor=1a1a2e)](LICENSE)
[![Obsidian](https://img.shields.io/badge/Obsidian-1.0%2B-7C3AED?style=flat-square&labelColor=1a1a2e)](https://obsidian.md)
[![Platform](https://img.shields.io/badge/platform-desktop%20%7C%20iOS%20%7C%20Android-C0392B?style=flat-square&labelColor=1a1a2e)](https://obsidian.md)

**Brief** is a client workspace manager for Obsidian. Switch between client spaces, create structured notes with consistent frontmatter, and auto-generate client dashboards — all from a side panel or the command palette.

</div>

---

## Features

- **Client spaces** — switch the active client from the status bar, ribbon, or command palette; each client gets its own accent color
- **Smart note creator** — choose a note type, fill in metadata, and Brief creates the note with the right frontmatter and folder
- **Client dashboards** — auto-generated overview of all notes in a client folder, grouped by type with relevant columns
- **Brief panel** — a sidebar with quick access to every action; all buttons are context-aware and disable when no editor is active
- **Frontmatter repair** — scan the current note for missing or malformed frontmatter fields and fix them in one step
- **Template application** — merge a note-type template into an existing note without touching its content

---

## Client Context Switcher

Switch the active client space at any time. The current client is shown in the status bar and highlighted in the ribbon icon. Each client can have an accent color — used as a colored dot in the status bar and as the banner accent in modals.

**Commands:**

| Command | Description |
|---|---|
| `Switch client space` | Open the fuzzy switcher to change the active client |
| `Open client dashboard` | Open the dashboard note for the active client |
| `Create new client` | Create a client folder, index note, and set it as active |
| `Set color for active client` | Assign an accent color to the current client |

---

## Smart Note Creator

Open the note creator modal from the panel or command palette. Choose a note type, fill in a title, tags, and optional metadata — Brief creates the note in the right folder with consistent frontmatter.

**Supported note types:**

| Type | Extra fields |
|---|---|
| Meeting | Attendees |
| Project | Status, Deadline |
| Brief | — |
| Research | Topic |
| Reference | — |
| Quick note | — |

**Commands:**

| Command | Description |
|---|---|
| `New note` | Open the note creator modal |
| `Apply template to current note` | Merge a template's frontmatter into the current note |
| `Scan and repair frontmatter` | Check and fix frontmatter on the current note |

---

## Client Dashboard

Each client has a dashboard note — a single file that gives an overview of all notes in the client folder. Brief generates a structured block inside the file, grouped by note type, with type-specific columns.

Click **Create dashboard** in the Brief panel to generate the initial file, or **Update dashboard** to regenerate the block after adding new notes. Content you write outside the generated block is never touched.

**Example output:**

```markdown
## Meetings (3)

| Note | Date | Attendees |
|------|------|-----------|
| [[Kick-off]] | 2026-04-01 | Alice, Bob |
...

## Projects (2)

| Note | Date | Status | Deadline |
|------|------|--------|----------|
| [[Website redesign]] | 2026-03-15 | In progress | 2026-06-01 |
...
```

---

## Brief Panel

Open the sidebar panel from the ribbon or with the `Open panel` command. The panel gives quick access to every action in one place.

- **Active client** — shows the current client with its accent color, a Switch button, Set color, and dashboard controls
- **Note Creator** — New note button and secondary actions for template and frontmatter repair

All buttons that require an active editor are automatically disabled when no note is open.

---

## Installation

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](../../releases/latest)
2. Copy them into `<vault>/.obsidian/plugins/brief/`
3. Reload Obsidian and enable the plugin under **Settings → Community plugins**

### Via BRAT

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. Open BRAT settings → **Add Beta Plugin**
3. Enter `stephanteig/obsidian-brief`

---

## Settings

| Setting | Default | Description |
|---|---|---|
| Clients folder | `Clients` | Root folder where client folders are created |
| Notes folder | `Notes` | Default folder for new notes |
| Templates folder | `Templates` | Folder Brief looks in for note templates |
| Enable Client Context | On | Toggle the client switcher module |
| Enable Note Creator | On | Toggle the note creator module |

---

## License

[MIT](LICENSE) © Stephan Teig
