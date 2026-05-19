// ─── Shared types for obsidian-brief ─────────────────────────────────────────

import type { Plugin } from "obsidian";

// ── Note Creator settings ─────────────────────────────────────────────────────

export interface NoteCreatorSettings {
    defaultFolder: string;
    openAfterCreate: boolean;
    interceptNewNote: boolean;
    warnOnMissingFrontmatter: boolean;
    dismissedFormatWarnings: string[];
}

export const DEFAULT_NOTE_CREATOR_SETTINGS: NoteCreatorSettings = {
    defaultFolder: "",
    openAfterCreate: true,
    interceptNewNote: true,
    warnOnMissingFrontmatter: true,
    dismissedFormatWarnings: [],
};

// ── Client Context settings ───────────────────────────────────────────────────

export interface ClientContextSettings {
    activeClient: string;
    clientsFolder: string;
    clientColors: Record<string, string>;
}

export const DEFAULT_CLIENT_CONTEXT_SETTINGS: ClientContextSettings = {
    activeClient: "",
    clientsFolder: "Clients",
    clientColors: {},
};

// ── Module toggle settings ────────────────────────────────────────────────────

export interface ModuleToggles {
    clientContext: boolean;
    noteCreator: boolean;
}

// ── Top-level plugin settings ─────────────────────────────────────────────────

export interface BriefSettings {
    modules: ModuleToggles;
    noteCreator: NoteCreatorSettings;
    clientContext: ClientContextSettings;
}

export const DEFAULT_BRIEF_SETTINGS: BriefSettings = {
    modules: {
        clientContext: true,
        noteCreator: true,
    },
    noteCreator: { ...DEFAULT_NOTE_CREATOR_SETTINGS },
    clientContext: { ...DEFAULT_CLIENT_CONTEXT_SETTINGS },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function normalizeFolderPath(raw: string): string {
    return raw
        .replace(/\\/g, "/")
        .replace(/\/+/g, "/")
        .replace(/^\/|\/$/g, "")
        .trim();
}

const ILLEGAL_NAME_CHARS = /[\\/:*?"<>|]/;

export function isValidVaultName(name: string): boolean {
    return name.length > 0 && !ILLEGAL_NAME_CHARS.test(name);
}

// ── Plugin interface that modules receive ─────────────────────────────────────

export type BriefPlugin = Plugin & {
    settings: BriefSettings;
    saveSettings(): Promise<void>;
    refreshPanel?: () => void;
};
