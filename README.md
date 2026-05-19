# Brief

Client workspace manager for Obsidian. Switch between client spaces, create structured notes with frontmatter, and auto-generate client dashboards — all from a side panel or the command palette.

## Features

### Client Context Switcher
Switch the active client space at any time. The current client is shown in the status bar and ribbon. Assign a color per client — used as an accent throughout the UI.

### Smart Note Creator
Create notes with consistent frontmatter from a set of note types (meeting, project, brief, research, reference, quick note). Apply templates to existing notes without overwriting content.

### Client Dashboard
Auto-generate a structured dashboard for the active client. Groups notes by type with relevant columns (attendees for meetings, status and deadline for projects, etc.). Safe to regenerate — only the generated section is replaced; manual content is preserved.

### Brief Panel
A sidebar panel with quick access to all actions: switch client, set color, create notes, and manage dashboards.

## Installation

### Via BRAT (recommended for early access)
1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. Open BRAT settings → Add Beta Plugin
3. Enter `stephanteig/obsidian-brief`

### Manual
1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/stephanteig/obsidian-brief/releases/latest)
2. Copy them to `.obsidian/plugins/brief/` in your vault
3. Enable the plugin in Settings → Community plugins

## Commands

| Command | Description |
|---|---|
| Open panel | Open the Brief side panel |
| Switch client space | Switch the active client |
| Open client dashboard | Open the dashboard for the active client |
| Create new client | Create a client folder and index note |
| Set color for active client | Assign an accent color to the active client |
| New note | Open the note creator modal |
| Scan and repair frontmatter | Check and fix frontmatter on the current note |
| Apply template to current note | Merge a note type template into an existing note |

## Settings

- **Clients folder** — Root folder where client folders are created (default: `Clients`)
- **Notes folder** — Default folder for new notes (default: `Notes`)
- **Templates folder** — Folder containing note templates (default: `Templates`)
- **Enable Client Context** — Toggle the client switcher module
- **Enable Note Creator** — Toggle the note creator module

## License

MIT
