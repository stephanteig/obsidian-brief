// ─── Brief Panel — ItemView ───────────────────────────────────────────────────

import { App, ItemView, Notice, TFile, WorkspaceLeaf, moment, setIcon } from "obsidian";
import type { BriefPlugin } from "../../types";

interface ObsidianInternal extends App {
    setting?: { open(): void; openTabById(id: string): void };
    commands?: { executeCommandById(id: string): void };
}

export const VIEW_TYPE_BRIEF_PANEL = "brief-panel";

// ── Dashboard content generation ──────────────────────────────────────────────

const GENERATED_START = "<!-- brief:generated:start -->";
const GENERATED_END   = "<!-- brief:generated:end -->";

const TYPE_ORDER = ["meeting", "project", "brief", "research", "reference", "quick"];

const TYPE_LABELS: Record<string, string> = {
    meeting:   "Meetings",
    project:   "Projects",
    brief:     "Client Briefs",
    research:  "Research",
    reference: "References",
    quick:     "Quick Notes",
};

function generateDashboardBlock(
    plugin: BriefPlugin,
    clientName: string,
    clientsFolder: string,
    dashPath: string,
): string {
    const clientFolderPath = `${clientsFolder}/${clientName}`;
    const allFiles = plugin.app.vault.getAllLoadedFiles();
    const clientFiles = allFiles.filter(
        (f): f is TFile =>
            f instanceof TFile &&
            f.extension === "md" &&
            f.path.startsWith(clientFolderPath + "/") &&
            f.path !== dashPath,
    );

    const groups: Record<string, Array<{ file: TFile; fm: Record<string, unknown> }>> = {};
    let lastModified = 0;

    for (const file of clientFiles) {
        const fm = (plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {}) as Record<string, unknown>;
        const type = typeof fm["type"] === "string" ? fm["type"] : "other";
        if (!groups[type]) groups[type] = [];
        groups[type].push({ file, fm });
        if (file.stat.mtime > lastModified) lastModified = file.stat.mtime;
    }

    for (const entries of Object.values(groups)) {
        entries.sort((a, b) =>
            String(b.fm["date"] ?? "").localeCompare(String(a.fm["date"] ?? "")),
        );
    }

    const totalNotes = clientFiles.length;
    const lastStr    = lastModified > 0 ? moment(lastModified).format("YYYY-MM-DD") : "—";
    const typeCount  = Object.keys(groups).filter(t => t !== "client").length;
    const updated    = moment().format("YYYY-MM-DD HH:mm");

    const lines: string[] = [
        GENERATED_START,
        "",
        "## Overview",
        "",
        "| Notes | Last activity | Types | Updated |",
        "|-------|---------------|-------|---------|",
        `| ${totalNotes} | ${lastStr} | ${typeCount} | ${updated} |`,
        "",
    ];

    if (totalNotes === 0) {
        lines.push("*No notes found in this client folder yet.*", "", GENERATED_END);
        return lines.join("\n");
    }

    const orderedTypes = [
        ...TYPE_ORDER.filter(t => t in groups),
        ...Object.keys(groups).filter(t => !TYPE_ORDER.includes(t) && t !== "client" && t !== "other"),
        ...("other" in groups ? ["other"] : []),
    ];

    for (const type of orderedTypes) {
        const entries = groups[type];
        if (!entries?.length) continue;
        const label = TYPE_LABELS[type] ?? (type.charAt(0).toUpperCase() + type.slice(1) + "s");
        lines.push(`## ${label} (${entries.length})`, "");

        if (type === "meeting") {
            lines.push("| Note | Date | Attendees |", "|------|------|-----------|");
            for (const { file, fm } of entries) {
                lines.push(`| [[${file.basename}]] | ${String(fm["date"] ?? "—")} | ${String(fm["attendees"] ?? "—")} |`);
            }
        } else if (type === "project") {
            lines.push("| Note | Date | Status | Deadline |", "|------|------|--------|----------|");
            for (const { file, fm } of entries) {
                lines.push(`| [[${file.basename}]] | ${String(fm["date"] ?? "—")} | ${String(fm["status"] ?? "—")} | ${String(fm["deadline"] ?? "—")} |`);
            }
        } else if (type === "research") {
            lines.push("| Note | Date | Topic |", "|------|------|-------|");
            for (const { file, fm } of entries) {
                lines.push(`| [[${file.basename}]] | ${String(fm["date"] ?? "—")} | ${String(fm["topic"] ?? "—")} |`);
            }
        } else {
            lines.push("| Note | Date |", "|------|------|");
            for (const { file, fm } of entries) {
                lines.push(`| [[${file.basename}]] | ${String(fm["date"] ?? "—")} |`);
            }
        }
        lines.push("");
    }

    lines.push(GENERATED_END);
    return lines.join("\n");
}

export class BriefPanelView extends ItemView {
    constructor(leaf: WorkspaceLeaf, private readonly plugin: BriefPlugin) {
        super(leaf);
    }

    getViewType(): string    { return VIEW_TYPE_BRIEF_PANEL; }
    getDisplayText(): string { return "Brief"; }
    getIcon(): string        { return "layout-dashboard"; }

    async onOpen(): Promise<void> {
        this.renderPanel();
        this.registerEvent(
            this.app.workspace.on("active-leaf-change", () => this.renderPanel())
        );
    }

    async onClose(): Promise<void> {
        this.contentEl.empty();
    }

    refresh(): void {
        this.renderPanel();
    }

    private renderPanel(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("dev-panel");

        this.renderHeader(contentEl);

        if (this.plugin.settings.modules.clientContext) {
            this.renderClientSection(contentEl);
        }
        if (this.plugin.settings.modules.noteCreator) {
            this.renderNoteCreatorSection(contentEl);
        }
    }

    private renderHeader(root: HTMLElement): void {
        const header = root.createDiv("dev-panel-header");

        const left = header.createDiv("dev-panel-header-left");
        const logoIcon = left.createSpan("dev-panel-logo-icon");
        setIcon(logoIcon, "briefcase");
        left.createEl("span", { text: "Brief", cls: "dev-panel-title" });

        const gearBtn = header.createDiv({ cls: "dev-panel-icon-btn" });
        gearBtn.setAttribute("aria-label", "Settings");
        setIcon(gearBtn, "settings");
        gearBtn.addEventListener("click", () => {
            const internal = this.app as unknown as ObsidianInternal;
            internal.setting?.open();
            internal.setting?.openTabById("brief");
        });
    }

    private renderClientSection(root: HTMLElement): void {
        const { activeClient, clientColors, clientsFolder } = this.plugin.settings.clientContext;
        const color = activeClient ? (clientColors?.[activeClient] ?? null) : null;
        const body = this.section(root, "Active client", "users");

        const pill = body.createDiv("dev-panel-client-pill");
        const dot = pill.createSpan("dev-cc-dot dev-panel-client-dot");
        if (color) dot.style.background = color;
        else if (!activeClient) dot.addClass("is-private");

        pill.createEl("span", {
            text: activeClient || "Private",
            cls: "dev-panel-client-name" + (activeClient ? "" : " is-private"),
        });

        const switchBtn = pill.createEl("button", { text: "Switch", cls: "dev-panel-pill-btn" });
        switchBtn.addEventListener("click", () => this.cmd("cc-switch-space"));

        if (activeClient) {
            const dashPath = `${clientsFolder}/${activeClient}/${activeClient}.md`;
            const dashExists = this.app.vault.getAbstractFileByPath(dashPath) instanceof TFile;

            const row = body.createDiv("dev-panel-row");
            this.secondaryBtn(row, "palette", "Set color", () => this.cmd("cc-set-client-color"));

            const dashIcon  = dashExists ? "square-pen"  : "file-plus-2";
            const dashLabel = dashExists ? "Update dashboard" : "Create dashboard";
            this.secondaryBtn(row, dashIcon, dashLabel, () => {
                void this.createOrOpenDashboard(activeClient, clientsFolder, dashPath, dashExists);
            });

            if (dashExists) {
                this.ghostBtn(body, "layout-dashboard", "Open dashboard", () => this.cmd("cc-open-dashboard"));
            }
        }

        this.ghostBtn(body, "user-plus", "Create new client", () => this.cmd("cc-create-client"));
    }

    private renderNoteCreatorSection(root: HTMLElement): void {
        const body = this.section(root, "Note Creator", "file-plus");
        const hasEditor = this.hasActiveEditor();

        this.primaryBtn(body, "file-plus", "New note", () => this.cmd("nc-new-note"));

        const row = body.createDiv("dev-panel-row");
        this.secondaryBtn(row, "wrench",     "Repair frontmatter", () => this.cmd("nc-repair-frontmatter"));
        this.secondaryBtn(row, "file-input", "Apply template",      () => this.cmd("nc-apply-template"), !hasEditor);
    }

    // ── Dashboard create / open ───────────────────────────────────────────────

    private async createOrOpenDashboard(
        clientName: string,
        clientsFolder: string,
        dashPath: string,
        exists: boolean,
    ): Promise<void> {
        let file = this.app.vault.getAbstractFileByPath(dashPath);

        if (!exists || !(file instanceof TFile)) {
            if (!this.app.vault.getAbstractFileByPath(clientsFolder)) {
                await this.app.vault.createFolder(clientsFolder);
            }
            const clientFolder = `${clientsFolder}/${clientName}`;
            if (!this.app.vault.getAbstractFileByPath(clientFolder)) {
                await this.app.vault.createFolder(clientFolder);
            }

            const today     = moment().format("YYYY-MM-DD");
            const slug      = clientName.toLowerCase().replace(/\s+/g, "-");
            const generated = generateDashboardBlock(this.plugin, clientName, clientsFolder, dashPath);
            const content   = [
                "---",
                `title: "${clientName}"`,
                `tags: ["client/${slug}"]`,
                `date: ${today}`,
                "type: client",
                "---",
                "",
                `# ${clientName}`,
                "",
                "_Add manual notes and context here. The sections below are auto-generated and updated when you click \"Update dashboard\"._",
                "",
                generated,
                "",
            ].join("\n");

            file = await this.app.vault.create(dashPath, content);
            new Notice(`Dashboard created for "${clientName}".`);
            this.renderPanel();
        } else {
            const current   = await this.app.vault.read(file);
            const generated = generateDashboardBlock(this.plugin, clientName, clientsFolder, dashPath);
            const startIdx  = current.indexOf(GENERATED_START);
            const endIdx    = current.indexOf(GENERATED_END);

            let updated: string;
            if (startIdx !== -1 && endIdx !== -1) {
                updated =
                    current.slice(0, startIdx) +
                    generated +
                    current.slice(endIdx + GENERATED_END.length);
            } else {
                updated = current.trimEnd() + "\n\n" + generated + "\n";
            }

            await this.app.vault.modify(file, updated);
            new Notice(`Dashboard updated for "${clientName}".`);
        }

        if (file instanceof TFile) {
            await this.app.workspace.getLeaf(false).openFile(file);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private section(root: HTMLElement, title: string, icon: string): HTMLElement {
        const wrap   = root.createDiv("dev-panel-section");
        const hdr    = wrap.createDiv("dev-panel-section-hdr");
        const iconEl = hdr.createSpan("dev-panel-section-icon");
        setIcon(iconEl, icon);
        hdr.createEl("span", { text: title, cls: "dev-panel-section-title" });
        return wrap.createDiv("dev-panel-section-body");
    }

    private primaryBtn(
        parent: HTMLElement,
        icon: string,
        label: string,
        onClick: () => void,
        disabled = false,
    ): HTMLElement {
        const btn = parent.createEl("button", { cls: "dev-panel-btn-primary" });
        if (disabled) {
            btn.addClass("is-disabled");
            btn.disabled = true;
            btn.setAttribute("aria-label", `${label} — requires active editor`);
        }
        const iconEl = btn.createSpan("dev-panel-btn-icon");
        setIcon(iconEl, icon);
        btn.createEl("span", { text: label });
        if (!disabled) btn.addEventListener("click", onClick);
        return btn;
    }

    private secondaryBtn(
        parent: HTMLElement,
        icon: string,
        label: string,
        onClick: () => void,
        disabled = false,
    ): HTMLElement {
        const btn = parent.createEl("button", { cls: "dev-panel-btn-secondary" });
        if (disabled) {
            btn.addClass("is-disabled");
            btn.disabled = true;
            btn.setAttribute("aria-label", `${label} — requires active editor`);
        }
        const iconEl = btn.createSpan("dev-panel-btn-icon");
        setIcon(iconEl, icon);
        btn.createEl("span", { text: label });
        if (!disabled) btn.addEventListener("click", onClick);
        return btn;
    }

    private ghostBtn(
        parent: HTMLElement,
        icon: string,
        label: string,
        onClick: () => void,
    ): HTMLElement {
        const btn    = parent.createEl("button", { cls: "dev-panel-btn-ghost" });
        const iconEl = btn.createSpan("dev-panel-btn-icon");
        setIcon(iconEl, icon);
        btn.createEl("span", { text: label });
        btn.addEventListener("click", onClick);
        return btn;
    }

    private cmd(id: string): void {
        (this.app as unknown as ObsidianInternal).commands?.executeCommandById(`brief:${id}`);
    }

    private hasActiveEditor(): boolean {
        return !!this.app.workspace.activeEditor?.editor;
    }
}
