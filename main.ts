import { Plugin, PluginSettingTab, Setting } from "obsidian";
import {
    DEFAULT_BRIEF_SETTINGS,
    DEFAULT_NOTE_CREATOR_SETTINGS,
    DEFAULT_CLIENT_CONTEXT_SETTINGS,
    normalizeFolderPath,
} from "./types";
import type { BriefSettings } from "./types";
import { loadClientContext } from "./modules/client-context/index";
import { loadNoteCreator } from "./modules/note-creator/index";
import { BriefPanelView, VIEW_TYPE_BRIEF_PANEL } from "./modules/panel/index";

// ─── Plugin ───────────────────────────────────────────────────────────────────

export default class BriefPlugin extends Plugin {
    settings: BriefSettings;
    refreshPanel?: () => void;

    async onload() {
        try {
            await this.loadSettings();

            this.registerView(
                VIEW_TYPE_BRIEF_PANEL,
                (leaf) => new BriefPanelView(leaf, this),
            );

            this.refreshPanel = () => {
                for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_BRIEF_PANEL)) {
                    if (leaf.view instanceof BriefPanelView) leaf.view.refresh();
                }
            };

            this.addRibbonIcon("layout-dashboard", "Open panel", () => {
                void this.activatePanel();
            });

            this.addCommand({
                id: "open-panel",
                name: "Open panel",
                callback: () => { void this.activatePanel(); },
            });

            if (this.settings.modules.clientContext) {
                loadClientContext(this);
            }

            if (this.settings.modules.noteCreator) {
                loadNoteCreator(this);
            }

            this.addSettingTab(new BriefSettingTab(this.app, this));
        } catch (err) {
            console.error("[Brief] Failed to load:", err);
            throw err;
        }
    }

    async activatePanel(): Promise<void> {
        const { workspace } = this.app;
        let leaf = workspace.getLeavesOfType(VIEW_TYPE_BRIEF_PANEL)[0];
        if (!leaf) {
            leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf(false);
            await leaf.setViewState({ type: VIEW_TYPE_BRIEF_PANEL, active: true });
        }
        void workspace.revealLeaf(leaf);
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_BRIEF_SETTINGS,
            await this.loadData()
        ) as BriefSettings;

        this.settings.modules = Object.assign(
            {},
            DEFAULT_BRIEF_SETTINGS.modules,
            this.settings.modules
        );
        this.settings.noteCreator = Object.assign(
            {},
            DEFAULT_NOTE_CREATOR_SETTINGS,
            this.settings.noteCreator
        );
        this.settings.clientContext = Object.assign(
            {},
            DEFAULT_CLIENT_CONTEXT_SETTINGS,
            this.settings.clientContext
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

class BriefSettingTab extends PluginSettingTab {
    plugin: BriefPlugin;

    constructor(app: import("obsidian").App, plugin: BriefPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // ── Module toggles ─────────────────────────────────────────────────
        new Setting(containerEl).setHeading().setName("Module toggles");
        new Setting(containerEl)
            .setDesc("Toggle modules on/off independently. Changes take effect after reloading the plugin.");

        const moduleToggles: { key: keyof BriefSettings["modules"]; label: string }[] = [
            { key: "clientContext",   label: "Client context switcher" },
            { key: "noteCreator",     label: "Smart note creator"      },
        ];

        for (const { key, label } of moduleToggles) {
            new Setting(containerEl)
                .setName(label)
                .addToggle((t) => t
                    .setValue(this.plugin.settings.modules[key])
                    .onChange(async (v) => {
                        this.plugin.settings.modules[key] = v;
                        await this.plugin.saveSettings();
                    }));
        }

        // ── Client Context ─────────────────────────────────────────────────
        new Setting(containerEl).setHeading().setName("Client context");

        new Setting(containerEl)
            .setName("Clients folder")
            .setDesc("Root folder where client subfolders are created.")
            .addText((t) => t
                .setPlaceholder("Clients")
                .setValue(this.plugin.settings.clientContext.clientsFolder)
                .onChange(async (v) => {
                    this.plugin.settings.clientContext.clientsFolder = normalizeFolderPath(v) || "Clients";
                    await this.plugin.saveSettings();
                }));

        // ── Note Creator ───────────────────────────────────────────────────
        new Setting(containerEl).setHeading().setName("Note creator");

        new Setting(containerEl)
            .setName("Default folder")
            .setDesc("Where new notes are created when no client is active. Leave blank for vault root.")
            .addText((t) => t
                .setPlaceholder("Notes")
                .setValue(this.plugin.settings.noteCreator.defaultFolder)
                .onChange(async (v) => {
                    this.plugin.settings.noteCreator.defaultFolder = normalizeFolderPath(v);
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Open after create")
            .setDesc("Open the new note immediately after creation.")
            .addToggle((t) => t
                .setValue(this.plugin.settings.noteCreator.openAfterCreate)
                .onChange(async (v) => {
                    this.plugin.settings.noteCreator.openAfterCreate = v;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Intercept new note")
            .setDesc("Show a prompt to use the note creator when a note is created outside it.")
            .addToggle((t) => t
                .setValue(this.plugin.settings.noteCreator.interceptNewNote)
                .onChange(async (v) => {
                    this.plugin.settings.noteCreator.interceptNewNote = v;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Warn on missing frontmatter")
            .setDesc("Show a warning (once per file) when opening a note without required frontmatter.")
            .addToggle((t) => t
                .setValue(this.plugin.settings.noteCreator.warnOnMissingFrontmatter)
                .onChange(async (v) => {
                    this.plugin.settings.noteCreator.warnOnMissingFrontmatter = v;
                    await this.plugin.saveSettings();
                }));
    }
}
