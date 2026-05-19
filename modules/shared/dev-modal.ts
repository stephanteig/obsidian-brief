// ─── BriefModal — base class for all Brief modals ────────────────────────────

import { App, Modal, setIcon } from "obsidian";
import type { BriefPlugin } from "../../types";

export abstract class BriefModal extends Modal {
    protected headerEl!: HTMLElement;
    protected bannerEl!: HTMLElement;
    protected stepIndicatorEl!: HTMLElement;
    protected bodyEl!: HTMLElement;
    protected footerEl!: HTMLElement;

    constructor(
        app: App,
        protected readonly plugin: BriefPlugin,
    ) {
        super(app);
    }

    abstract getModalTitle(): string;
    abstract getModalIcon(): string;

    getStepCount(): number | undefined { return undefined; }
    getCurrentStep(): number { return 1; }

    abstract renderBody(): void;
    abstract renderFooter(): void;

    protected onSwitchClient(): void { /* no-op by default */ }

    onOpen(): void {
        this.modalEl.addClass("dev-modal");

        const contentEl = this.contentEl;
        this.headerEl        = contentEl.createDiv("dev-modal-header");
        this.bannerEl        = contentEl.createDiv("dev-modal-client-banner");
        this.stepIndicatorEl = contentEl.createDiv("dev-step-indicator");
        this.bodyEl          = contentEl.createDiv("dev-modal-body");
        this.footerEl        = contentEl.createDiv("dev-modal-footer");

        this.drawHeader();
        this.drawBanner();
        this.drawStepIndicator();
        this.renderBody();
        this.renderFooter();
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private drawHeader(): void {
        const iconEl = this.headerEl.createDiv("dev-modal-header-icon");
        setIcon(iconEl, this.getModalIcon());
        this.headerEl.createEl("h2", {
            text: this.getModalTitle(),
            cls:  "dev-modal-title",
        });
    }

    private drawBanner(): void {
        const activeClient = this.plugin.settings.clientContext.activeClient;

        if (!activeClient) {
            this.bannerEl.addClass("is-hidden");
            return;
        }

        this.bannerEl.createSpan({
            text: `Space: ${activeClient}`,
            cls:  "dev-modal-client-banner__label",
        });

        const switchBtn = this.bannerEl.createEl("button", {
            text: "Switch",
            cls:  "dev-modal-client-banner__switch",
        });
        switchBtn.addEventListener("click", () => this.onSwitchClient());
    }

    private drawStepIndicator(): void {
        const count = this.getStepCount();
        if (!count) {
            this.stepIndicatorEl.addClass("is-hidden");
            return;
        }

        const current = this.getCurrentStep();
        for (let i = 1; i <= count; i++) {
            const step = this.stepIndicatorEl.createDiv("dev-step-indicator__step");
            if (i < current)        step.addClass("is-done");
            else if (i === current) step.addClass("is-active");
        }
    }

    protected refreshBanner(): void {
        this.bannerEl.empty();
        this.bannerEl.removeClass("is-hidden");

        const activeClient = this.plugin.settings.clientContext.activeClient;
        if (!activeClient) {
            this.bannerEl.addClass("is-hidden");
            return;
        }

        this.bannerEl.createSpan({
            text: `Space: ${activeClient}`,
            cls:  "dev-modal-client-banner__label",
        });
        const switchBtn = this.bannerEl.createEl("button", {
            text: "Switch",
            cls:  "dev-modal-client-banner__switch",
        });
        switchBtn.addEventListener("click", () => this.onSwitchClient());
    }

    protected refreshStepIndicator(): void {
        this.stepIndicatorEl.empty();
        this.drawStepIndicator();
    }

    protected addFooterButton(
        text: string,
        isPrimary: boolean,
        onClick: () => void,
    ): HTMLButtonElement {
        const btn = this.footerEl.createEl("button", {
            text,
            cls: isPrimary ? "mod-cta" : undefined,
        });
        btn.addEventListener("click", onClick);
        return btn;
    }
}
