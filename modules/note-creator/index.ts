// ─── Smart Note Creator ───────────────────────────────────────────────────────

import {
    App,
    Editor,
    Notice,
    Setting,
    TFile,
    moment,
    setIcon,
} from "obsidian";
import type { BriefPlugin } from "../../types";
import { BriefModal } from "../shared/dev-modal";
import { ClientSwitcherModal } from "../shared/client-switcher";

// ── Note type definitions ─────────────────────────────────────────────────────

interface NoteTypeField {
    key: string;
    label: string;
    placeholder: string;
}

interface NoteType {
    id: string;
    label: string;
    icon: string;
    extraFields: NoteTypeField[];
}

const NOTE_TYPES: NoteType[] = [
    {
        id: "meeting", label: "Meeting", icon: "users",
        extraFields: [
            { key: "attendees", label: "Attendees", placeholder: "Name, Name, ..." },
            { key: "resources", label: "Resources", placeholder: "Note or link" },
        ],
    },
    {
        id: "project", label: "Project", icon: "folder-open",
        extraFields: [
            { key: "client",   label: "Client",   placeholder: "" },
            { key: "status",   label: "Status",   placeholder: "Active" },
            { key: "deadline", label: "Deadline", placeholder: "YYYY-MM-DD" },
        ],
    },
    {
        id: "brief", label: "Client brief", icon: "file-text",
        extraFields: [
            { key: "client", label: "Client", placeholder: "" },
        ],
    },
    {
        id: "research", label: "Research", icon: "search",
        extraFields: [
            { key: "source", label: "Source", placeholder: "URL or reference" },
            { key: "topic",  label: "Topic",  placeholder: "" },
        ],
    },
    {
        id: "quick", label: "Quick note", icon: "zap",
        extraFields: [],
    },
    {
        id: "reference", label: "Reference", icon: "link",
        extraFields: [
            { key: "url", label: "URL", placeholder: "https://" },
        ],
    },
];

// ── Flag to suppress intercept notice for notes we create ourselves ───────────
let creatingOurOwnNote = false;

// ── Module loader ─────────────────────────────────────────────────────────────

export function loadNoteCreator(plugin: BriefPlugin): void {
    plugin.addCommand({
        id: "nc-new-note",
        name: "New note",
        callback: () => {
            new NoteCreatorModal(plugin.app, plugin).open();
        },
    });

    plugin.addCommand({
        id: "nc-repair-frontmatter",
        name: "Scan and repair frontmatter",
        callback: () => {
            void repairFrontmatter(plugin);
        },
    });

    plugin.addCommand({
        id: "nc-apply-template",
        name: "Apply template to current note",
        editorCallback: (editor: Editor, ctx) => {
            const file = ctx.file;
            if (!file) {
                new Notice("No active file.");
                return;
            }
            new ApplyTemplateModal(plugin.app, plugin, file, editor).open();
        },
    });

    plugin.app.workspace.onLayoutReady(() => {
        plugin.registerEvent(
            plugin.app.vault.on("create", (abstractFile) => {
                if (!(abstractFile instanceof TFile)) return;
                if (abstractFile.extension !== "md") return;
                if (creatingOurOwnNote) return;
                if (!plugin.settings.noteCreator.interceptNewNote) return;
                if (Date.now() - abstractFile.stat.ctime > 3000) return;
                showInterceptNotice(plugin);
            })
        );

        plugin.registerEvent(
            plugin.app.workspace.on("file-open", (file) => {
                if (!file || !(file instanceof TFile)) return;
                if (file.extension !== "md") return;
                if (!plugin.settings.noteCreator.warnOnMissingFrontmatter) return;
                if (plugin.settings.noteCreator.dismissedFormatWarnings.includes(file.path)) return;
                setTimeout(() => {
                    if (!isFormattedCorrectly(plugin, file)) {
                        showFrontmatterWarning(plugin, file);
                    }
                }, 400);
            })
        );
    });
}

// ── Notice helpers ────────────────────────────────────────────────────────────

function showInterceptNotice(plugin: BriefPlugin): void {
    const notice = new Notice("", 8000);
    notice.messageEl.addClass("dev-nc-intercept-notice");

    const header = notice.messageEl.createDiv("dev-nc-notice-header");
    header.createSpan({ text: "New note created", cls: "dev-nc-notice-title" });
    const closeBtn = header.createEl("button", { cls: "dev-nc-notice-close" });
    setIcon(closeBtn, "x");
    closeBtn.addEventListener("click", () => notice.hide());

    notice.messageEl.createDiv({
        text: "Use Note Creator for structured notes with frontmatter?",
        cls: "dev-nc-intercept-text",
    });

    const actions = notice.messageEl.createDiv("dev-nc-notice-actions");
    const btn = actions.createEl("button", { text: "Open note creator", cls: "dev-nc-intercept-btn" });
    btn.addEventListener("click", () => {
        notice.hide();
        new NoteCreatorModal(plugin.app, plugin).open();
    });
}

function isFormattedCorrectly(plugin: BriefPlugin, file: TFile): boolean {
    const fm = plugin.app.metadataCache.getFileCache(file)?.frontmatter;
    if (!fm) return false;
    return !!(fm["title"] && fm["date"] && fm["tags"]);
}

function showFrontmatterWarning(plugin: BriefPlugin, file: TFile): void {
    const notice = new Notice("", 10000);
    notice.messageEl.addClass("dev-nc-intercept-notice");

    const header = notice.messageEl.createDiv("dev-nc-notice-header");
    header.createSpan({ text: "Missing frontmatter", cls: "dev-nc-notice-title" });
    const closeBtn = header.createEl("button", { cls: "dev-nc-notice-close" });
    setIcon(closeBtn, "x");
    closeBtn.addEventListener("click", () => notice.hide());

    notice.messageEl.createDiv({
        text: `"${file.basename}" is missing title, date, or tags frontmatter.`,
        cls: "dev-nc-intercept-text",
    });

    const actions = notice.messageEl.createDiv("dev-nc-notice-actions");

    const applyBtn = actions.createEl("button", { text: "Apply template", cls: "dev-nc-intercept-btn" });
    applyBtn.addEventListener("click", () => {
        notice.hide();
        const editor = plugin.app.workspace.activeEditor?.editor;
        if (editor) new ApplyTemplateModal(plugin.app, plugin, file, editor).open();
    });

    const dismissBtn = actions.createEl("button", { text: "Don't show again", cls: "dev-nc-notice-dismiss" });
    dismissBtn.addEventListener("click", () => {
        void dismissFormatWarning(plugin, file.path);
        notice.hide();
    });
}

async function dismissFormatWarning(plugin: BriefPlugin, path: string): Promise<void> {
    if (!plugin.settings.noteCreator.dismissedFormatWarnings.includes(path)) {
        plugin.settings.noteCreator.dismissedFormatWarnings.push(path);
        await plugin.saveSettings();
    }
}

// ── Note Creator Modal ────────────────────────────────────────────────────────

class NoteCreatorModal extends BriefModal {
    private step = 1;
    private title = "";
    private selectedType: NoteType = NOTE_TYPES[4];
    private tags = "";
    private extraValues: Record<string, string> = {};

    constructor(app: App, plugin: BriefPlugin) {
        super(app, plugin);
        this.title = moment().format("YYYY-MM-DD") + " ";
    }

    getModalTitle(): string { return "New note"; }
    getModalIcon(): string  { return "file-plus"; }
    getStepCount(): number  { return 3; }
    getCurrentStep(): number { return this.step; }

    renderBody(): void   { this.renderStepBody(); }
    renderFooter(): void { this.renderStepFooter(); }

    protected onSwitchClient(): void {
        new ClientSwitcherModal(this.app, this.plugin, async (client) => {
            this.plugin.settings.clientContext.activeClient = client;
            await this.plugin.saveSettings();
            this.refreshBanner();
            if (this.step === 3) this.transition(3);
            new Notice(`Active space: ${client || "Private"}`);
        }).open();
    }

    private transition(nextStep: number): void {
        this.step = nextStep;
        this.bodyEl.empty();
        this.footerEl.empty();
        this.refreshStepIndicator();
        this.renderStepBody();
        this.renderStepFooter();
    }

    private renderStepBody(): void {
        if (this.step === 1) this.renderStep1Body();
        else if (this.step === 2) this.renderStep2Body();
        else this.renderStep3Body();
    }

    private renderStepFooter(): void {
        if (this.step === 1) this.renderStep1Footer();
        else if (this.step === 2) this.renderStep2Footer();
        else this.renderStep3Footer();
    }

    private renderStep1Body(): void {
        new Setting(this.bodyEl)
            .setName("Note title")
            .setDesc("Edit the date prefix or replace it entirely.")
            .addText((t) => {
                t.setValue(this.title).onChange((v) => { this.title = v; });
                t.inputEl.addClass("brief-input-full");
                t.inputEl.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" && this.title.trim()) this.goNext();
                });
                setTimeout(() => {
                    t.inputEl.focus();
                    t.inputEl.setSelectionRange(t.inputEl.value.length, t.inputEl.value.length);
                }, 30);
            });
    }

    private renderStep1Footer(): void {
        this.addFooterButton("Next →", true, () => this.goNext());
    }

    private goNext(): void {
        if (!this.title.trim()) {
            new Notice("Title is required.");
            return;
        }
        this.transition(2);
    }

    private renderStep2Body(): void {
        const grid = this.bodyEl.createDiv("dev-nc-type-grid");

        for (const type of NOTE_TYPES) {
            const card = grid.createDiv("dev-nc-type-card");
            if (type.id === this.selectedType.id) card.addClass("is-selected");

            const iconEl = card.createDiv("dev-nc-type-icon");
            setIcon(iconEl, type.icon);
            card.createEl("span", { text: type.label, cls: "dev-nc-type-label" });

            card.addEventListener("click", () => {
                this.selectedType = type;
                this.extraValues = {};
                this.transition(3);
            });
        }
    }

    private renderStep2Footer(): void {
        this.addFooterButton("← Back", false, () => this.transition(1));
    }

    private renderStep3Body(): void {
        const activeClient = this.plugin.settings.clientContext.activeClient;

        new Setting(this.bodyEl)
            .setName("Tags")
            .setDesc("Comma-separated.")
            .addText((t) => {
                t.setPlaceholder("Work, personal, ...")
                    .setValue(this.tags)
                    .onChange((v) => { this.tags = v; });
                t.inputEl.addClass("brief-input-full");
            });

        for (const field of this.selectedType.extraFields) {
            const prefill = field.key === "client" && activeClient ? activeClient : "";
            const initialValue = this.extraValues[field.key] ?? prefill;
            if (field.key === "client" && !(field.key in this.extraValues)) {
                this.extraValues[field.key] = initialValue;
            }
            new Setting(this.bodyEl)
                .setName(field.label)
                .addText((t) => {
                    t.setPlaceholder(field.placeholder)
                        .setValue(initialValue)
                        .onChange((v) => { this.extraValues[field.key] = v; });
                    t.inputEl.addClass("brief-input-full");
                });
        }

        const clientField = this.extraValues["client"];
        if (activeClient && clientField !== undefined && clientField !== activeClient) {
            const warn = this.bodyEl.createDiv("dev-nc-client-warning");
            const iconWrap = warn.createSpan("dev-nc-warning-icon");
            setIcon(iconWrap, "alert-triangle");
            warn.createSpan({
                text: `Active space is "${activeClient}" but note will use client "${clientField}".`,
                cls: "dev-nc-warning-text",
            });
        }
    }

    private renderStep3Footer(): void {
        this.addFooterButton("← Back", false, () => this.transition(2));
        this.addFooterButton("Create note", true, () => { void this.createNote(); });
    }

    private async createNote(): Promise<void> {
        const title = this.title.trim();
        if (!title) {
            new Notice("Title is required.");
            return;
        }

        const { activeClient, clientsFolder } = this.plugin.settings.clientContext;
        const defaultFolder = this.plugin.settings.noteCreator.defaultFolder;
        const folder = activeClient ? `${clientsFolder}/${activeClient}` : defaultFolder;
        const today = moment().format("YYYY-MM-DD");

        const tagList = [
            this.selectedType.id,
            ...this.tags.split(",").map((t) => t.trim()).filter(Boolean),
        ];

        const extraLines: string[] = [];
        for (const field of this.selectedType.extraFields) {
            const val = this.extraValues[field.key]?.trim() ?? "";
            if (val) extraLines.push(`${field.key}: "${val}"`);
        }
        if (this.selectedType.id === "brief") extraLines.push('type: brief');

        const frontmatter = [
            "---",
            `title: "${title}"`,
            `tags: [${tagList.map((t) => `"${t}"`).join(", ")}]`,
            `date: ${today}`,
            ...extraLines,
            "---",
            "",
            "",
        ].join("\n");

        const safeName = title.replace(/[\\/:*?"<>|]/g, "-");
        const base = folder ? `${folder}/${safeName}` : safeName;
        let path = `${base}.md`;
        let counter = 1;
        while (this.app.vault.getAbstractFileByPath(path)) {
            path = `${base} ${counter++}.md`;
        }

        try {
            await ensureFolder(this.app, folder);
            creatingOurOwnNote = true;
            const file = await this.app.vault.create(path, frontmatter);
            creatingOurOwnNote = false;
            this.close();

            if (this.plugin.settings.noteCreator.openAfterCreate) {
                const leaf = this.app.workspace.getLeaf(false);
                await leaf.openFile(file);
                const editor = this.app.workspace.activeEditor?.editor;
                if (editor) {
                    const line = frontmatter.split("\n").length - 1;
                    editor.setCursor({ line, ch: 0 });
                }
            }

            new Notice(`Created: ${safeName}`);
        } catch (err) {
            creatingOurOwnNote = false;
            console.error("[Brief] Note creator error:", err);
            new Notice(`Failed to create note: ${String(err)}`);
        }
    }
}

// ── Apply Template Modal ──────────────────────────────────────────────────────

class ApplyTemplateModal extends BriefModal {
    constructor(
        app: App,
        plugin: BriefPlugin,
        private readonly file: TFile,
        private readonly editor: Editor,
    ) {
        super(app, plugin);
    }

    getModalTitle(): string { return "Apply template"; }
    getModalIcon(): string  { return "file-input"; }

    renderBody(): void {
        this.bodyEl.createEl("p", {
            text: "Choose a note type to merge into the current note. Existing frontmatter fields are kept.",
            cls: "dev-nc-apply-desc",
        });

        const grid = this.bodyEl.createDiv("dev-nc-type-grid");

        for (const type of NOTE_TYPES) {
            const card = grid.createDiv("dev-nc-type-card");
            const iconEl = card.createDiv("dev-nc-type-icon");
            setIcon(iconEl, type.icon);
            card.createEl("span", { text: type.label, cls: "dev-nc-type-label" });

            card.addEventListener("click", () => {
                void this.applyTemplate(type);
                this.close();
            });
        }
    }

    renderFooter(): void {
        this.addFooterButton("Cancel", false, () => this.close());
    }

    private async applyTemplate(type: NoteType): Promise<void> {
        const content = this.editor.getValue();
        const cache = this.plugin.app.metadataCache.getFileCache(this.file);
        const existingFm = cache?.frontmatter ?? {};
        const today = moment().format("YYYY-MM-DD");
        const activeClient = this.plugin.settings.clientContext.activeClient;

        const newFields: Record<string, string> = {};
        if (!existingFm["title"]) newFields["title"] = `"${this.file.basename}"`;
        if (!existingFm["tags"])  newFields["tags"]  = `["${type.id}"]`;
        if (!existingFm["date"])  newFields["date"]  = today;

        for (const field of type.extraFields) {
            if (!existingFm[field.key]) {
                if (field.key === "client" && activeClient) {
                    newFields["client"] = `"${activeClient}"`;
                }
            }
        }

        if (Object.keys(newFields).length === 0 && existingFm["tags"]) {
            new Notice("Note already has all required frontmatter fields.");
            return;
        }

        let patched: string;
        if (!content.startsWith("---")) {
            const lines = [
                "---",
                `title: "${this.file.basename}"`,
                `tags: ["${type.id}"]`,
                `date: ${today}`,
                "---",
                "",
                content,
            ].join("\n");
            patched = lines;
        } else {
            patched = insertFrontmatterFields(content, newFields);
        }

        await this.plugin.app.vault.modify(this.file, patched);
        this.editor.setValue(patched);
        new Notice(`Template "${type.label}" applied to ${this.file.basename}.`);
    }
}

// ── Scan and repair frontmatter ───────────────────────────────────────────────

async function repairFrontmatter(plugin: BriefPlugin): Promise<void> {
    const files = plugin.app.vault.getMarkdownFiles();
    const today = moment().format("YYYY-MM-DD");
    const repaired: string[] = [];
    const skipped: string[] = [];

    for (const file of files) {
        const cache = plugin.app.metadataCache.getFileCache(file);
        const fm = cache?.frontmatter;

        if (!fm) {
            skipped.push(`- [[${file.basename}]] — no frontmatter (skipped)`);
            continue;
        }

        const missing: Record<string, string> = {};
        if (!fm["title"]) missing["title"] = `"${file.basename}"`;
        if (!fm["date"])  missing["date"]  = today;
        if (!fm["tags"])  missing["tags"]  = "[]";

        if (Object.keys(missing).length === 0) continue;

        const content = await plugin.app.vault.read(file);
        const patched = insertFrontmatterFields(content, missing);
        await plugin.app.vault.modify(file, patched);
        repaired.push(`- [[${file.basename}]] — added: ${Object.keys(missing).join(", ")}`);
    }

    if (repaired.length === 0) {
        new Notice("Frontmatter scan complete — all notes are complete. No repairs needed.");
        return;
    }

    const reportPath = `Brief frontmatter repair ${today}.md`;
    const reportContent = [
        "---",
        `title: "Frontmatter repair report"`,
        `date: ${today}`,
        'tags: ["brief", "repair-report"]',
        "---",
        "",
        `# Frontmatter repair — ${today}`,
        "",
        `${repaired.length} file(s) repaired. ${skipped.length} file(s) had no frontmatter and were skipped.`,
        "",
        "## Repaired",
        "",
        ...repaired,
        ...(skipped.length > 0 ? ["", "## Skipped (no frontmatter)", "", ...skipped] : []),
    ].join("\n");

    try {
        const existing = plugin.app.vault.getAbstractFileByPath(reportPath);
        let reportFile: TFile;
        if (existing instanceof TFile) {
            await plugin.app.vault.modify(existing, reportContent);
            reportFile = existing;
        } else {
            reportFile = await plugin.app.vault.create(reportPath, reportContent);
        }
        await plugin.app.workspace.getLeaf(false).openFile(reportFile);
        new Notice(`Frontmatter repair — ${repaired.length} file(s) updated.`);
    } catch (err) {
        console.error("[Brief] Frontmatter repair error:", err);
        new Notice("Frontmatter repair failed — see console.");
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function insertFrontmatterFields(
    content: string,
    fields: Record<string, string>
): string {
    if (!content.startsWith("---")) return content;
    const closeIdx = content.indexOf("\n---", 3);
    if (closeIdx === -1) return content;

    const fieldLines = Object.entries(fields)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");

    return content.slice(0, closeIdx) + "\n" + fieldLines + content.slice(closeIdx);
}

async function ensureFolder(app: App, path: string): Promise<void> {
    if (!path) return;
    const parts = path.split("/");
    let current = "";
    for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        if (!app.vault.getAbstractFileByPath(current)) {
            await app.vault.createFolder(current);
        }
    }
}

