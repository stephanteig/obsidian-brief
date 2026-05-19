// ─── Client Context Switcher ──────────────────────────────────────────────────

import {
    App,
    Modal,
    Notice,
    Setting,
    TFile,
    moment,
} from "obsidian";
import type { BriefPlugin } from "../../types";
import { isValidVaultName } from "../../types";
import { ClientSwitcherModal } from "../shared/client-switcher";

// ── Module loader ─────────────────────────────────────────────────────────────

export function loadClientContext(plugin: BriefPlugin): void {

    const statusBar = plugin.addStatusBarItem();
    statusBar.addClass("dev-cc-status");
    plugin.registerDomEvent(statusBar, "click", () => openSwitcher());

    const ribbon = plugin.addRibbonIcon("users", "Client context", () => openSwitcher());
    ribbon.addClass("dev-cc-ribbon");

    plugin.app.workspace.onLayoutReady(() => {
        renderStatusBar(statusBar, plugin);
        updateRibbon(ribbon, plugin);
    });

    function syncUI(): void {
        renderStatusBar(statusBar, plugin);
        updateRibbon(ribbon, plugin);
        plugin.refreshPanel?.();
    }

    function openSwitcher(): void {
        new ClientSwitcherModal(plugin.app, plugin, async (client) => {
            plugin.settings.clientContext.activeClient = client;
            await plugin.saveSettings();
            syncUI();
            new Notice(`Active space: ${client || "Private"}`);
        }).open();
    }

    plugin.addCommand({
        id: "cc-switch-space",
        name: "Switch client space",
        callback: () => openSwitcher(),
    });

    plugin.addCommand({
        id: "cc-open-dashboard",
        name: "Open client dashboard",
        callback: () => { void openDashboard(plugin); },
    });

    plugin.addCommand({
        id: "cc-create-client",
        name: "Create new client",
        callback: () => {
            new NewClientModal(plugin.app, plugin, () => syncUI()).open();
        },
    });

    plugin.addCommand({
        id: "cc-set-client-color",
        name: "Set color for active client",
        callback: () => {
            const { activeClient } = plugin.settings.clientContext;
            if (!activeClient) {
                new Notice("No active client. Switch to a client space first.");
                return;
            }
            new SetClientColorModal(plugin.app, plugin, activeClient, () => syncUI()).open();
        },
    });
}

// ── Status bar renderer ───────────────────────────────────────────────────────

function renderStatusBar(el: HTMLElement, plugin: BriefPlugin): void {
    el.empty();
    const { activeClient, clientColors } = plugin.settings.clientContext;
    const color = activeClient ? (clientColors?.[activeClient] ?? null) : null;

    const dot = el.createSpan("dev-cc-dot");
    if (color) {
        dot.style.background = color;
    } else if (!activeClient) {
        dot.addClass("is-private");
    }

    el.createSpan({ text: activeClient || "Private", cls: "dev-cc-label" });
}

// ── Ribbon updater ────────────────────────────────────────────────────────────

function updateRibbon(el: HTMLElement, plugin: BriefPlugin): void {
    const { activeClient } = plugin.settings.clientContext;
    el.setAttr(
        "aria-label",
        activeClient ? `Active space: ${activeClient}` : "Active space: Private",
    );
    el.toggleClass("dev-cc-ribbon-active", !!activeClient);
}

// ── New Client Modal ──────────────────────────────────────────────────────────

class NewClientModal extends Modal {
    private clientName = "";

    constructor(
        app: App,
        private readonly plugin: BriefPlugin,
        private readonly onCreated: () => void,
    ) {
        super(app);
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.createEl("h3", { text: "Create new client" });

        new Setting(contentEl)
            .setName("Client name")
            .addText((t) => {
                t.setPlaceholder("Acme corp")
                    .onChange((v) => { this.clientName = v; });
                t.inputEl.addClass("brief-input-full");
                t.inputEl.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") void this.createClient();
                });
                setTimeout(() => t.inputEl.focus(), 30);
            });

        const footer = contentEl.createDiv("dev-nc-footer");
        const createBtn = footer.createEl("button", { text: "Create", cls: "mod-cta" });
        createBtn.addEventListener("click", () => { void this.createClient(); });
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private async createClient(): Promise<void> {
        const name = this.clientName.trim();
        if (!name) {
            new Notice("Client name is required.");
            return;
        }
        if (!isValidVaultName(name)) {
            new Notice('Client name cannot contain \\ / : * ? " < > |');
            return;
        }

        const { clientsFolder } = this.plugin.settings.clientContext;
        const clientPath = `${clientsFolder}/${name}`;

        if (this.app.vault.getAbstractFileByPath(clientPath)) {
            new Notice(`Client "${name}" already exists.`);
            return;
        }

        try {
            if (!this.app.vault.getAbstractFileByPath(clientsFolder)) {
                await this.app.vault.createFolder(clientsFolder);
            }
            await this.app.vault.createFolder(clientPath);

            const today = moment().format("YYYY-MM-DD");
            const slug = name.toLowerCase().replace(/\s+/g, "-");
            const indexContent = [
                "---",
                `title: "${name}"`,
                `tags: ["client/${slug}"]`,
                `date: ${today}`,
                "type: client",
                "---",
                "",
                `# ${name}`,
                "",
                "## Overview",
                "",
                "## Notes",
                "",
                "## Tasks",
                "",
            ].join("\n");

            const indexFile = await this.app.vault.create(
                `${clientPath}/${name}.md`,
                indexContent,
            );

            this.plugin.settings.clientContext.activeClient = name;
            await this.plugin.saveSettings();

            this.close();
            this.onCreated();
            new Notice(`Client "${name}" created and set as active space.`);

            await this.app.workspace.getLeaf(false).openFile(indexFile);
        } catch (err) {
            console.error("[Brief] Create client error:", err);
            new Notice(`Failed to create client: ${String(err)}`);
        }
    }
}

// ── Set Client Color Modal ────────────────────────────────────────────────────

class SetClientColorModal extends Modal {
    private color: string;

    constructor(
        app: App,
        private readonly plugin: BriefPlugin,
        private readonly clientName: string,
        private readonly onSaved: () => void,
    ) {
        super(app);
        this.color = plugin.settings.clientContext.clientColors?.[clientName] ?? "#4A90D9";
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.createEl("h3", { text: `Color for "${this.clientName}"` });

        new Setting(contentEl)
            .setName("Client color")
            .setDesc("Used as the accent color in the status bar and modal banners.")
            .addColorPicker((cp) =>
                cp.setValue(this.color)
                    .onChange((v) => { this.color = v; })
            );

        const footer = contentEl.createDiv("dev-nc-footer");

        const cancel = footer.createEl("button", { text: "Cancel" });
        cancel.addEventListener("click", () => this.close());

        const save = footer.createEl("button", { text: "Save", cls: "mod-cta" });
        save.addEventListener("click", () => { void this.save(); });
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private async save(): Promise<void> {
        if (!this.plugin.settings.clientContext.clientColors) {
            this.plugin.settings.clientContext.clientColors = {};
        }
        this.plugin.settings.clientContext.clientColors[this.clientName] = this.color;
        await this.plugin.saveSettings();
        this.close();
        this.onSaved();
        new Notice(`Color saved for "${this.clientName}".`);
    }
}

// ── Open client dashboard ─────────────────────────────────────────────────────

async function openDashboard(plugin: BriefPlugin): Promise<void> {
    const { activeClient, clientsFolder } = plugin.settings.clientContext;

    if (!activeClient) {
        new Notice("No active client. Switch to a client space first.");
        return;
    }

    const indexPath = `${clientsFolder}/${activeClient}/${activeClient}.md`;
    const file = plugin.app.vault.getAbstractFileByPath(indexPath);

    if (file instanceof TFile) {
        await plugin.app.workspace.getLeaf(false).openFile(file);
    } else {
        new Notice(`No dashboard found for "${activeClient}" at ${indexPath}`);
    }
}
