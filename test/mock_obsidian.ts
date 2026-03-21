/**
 * Mock of the Obsidian module for Jest unit tests.
 * Mapped via jest.config.js moduleNameMapper: obsidian → this file.
 */

// Polyfill Obsidian's non-standard String.prototype.contains (alias for includes)
if (!('contains' in String.prototype)) {
  (String.prototype as any).contains = String.prototype.includes;
}

// ── Core utilities ────────────────────────────────────────────────────────────

export const requestUrl = jest.fn();
export const normalizePath = (p: string) => p.replace(/\\/g, '/');

// ── UI primitives ─────────────────────────────────────────────────────────────

export class Notice {
  noticeEl = document.createElement('div');
  constructor(public message: string, public _timeout?: number) {}
  setMessage(msg: string) {
    this.message = msg;
    return this;
  }
  hide() {}
}

export class Modal {
  contentEl = document.createElement('div');
  constructor(public app: any) {}
  open = jest.fn();
  close = jest.fn();
}

export class SuggestModal<T> extends Modal {
  constructor(app: any) {
    super(app);
  }
}

export class ButtonComponent {
  setButtonText = jest.fn().mockReturnThis();
  setCta = jest.fn().mockReturnThis();
  setDisabled = jest.fn().mockReturnThis();
  onClick = jest.fn().mockReturnThis();
}

export class TextComponent {
  inputEl = document.createElement('input');
  setValue = jest.fn().mockReturnThis();
  setPlaceholder = jest.fn().mockReturnThis();
  onChange = jest.fn().mockReturnThis();
}

export class ProgressBarComponent {
  constructor(_el: any) {}
  setValue = jest.fn();
}

export class Setting {
  constructor(..._args: any[]) {}
  setName = jest.fn().mockReturnThis();
  setDesc = jest.fn().mockReturnThis();
  setClass = jest.fn().mockReturnThis();
  setHeading = jest.fn().mockReturnThis();
  addText = jest.fn().mockReturnThis();
  addTextArea = jest.fn().mockReturnThis();
  addToggle = jest.fn().mockReturnThis();
  addButton = jest.fn().mockReturnThis();
  addSearch = jest.fn().mockReturnThis();
}

// ── Vault / File system ───────────────────────────────────────────────────────

export class TAbstractFile {}
export class TFile extends TAbstractFile {
  name = '';
  basename = '';
  extension = 'md';
  path = '';
}
export class TFolder extends TAbstractFile {
  children: TAbstractFile[] = [];
}

export class Vault {
  static recurseChildren = jest.fn();
  create = jest.fn();
  read = jest.fn();
  modify = jest.fn();
  cachedRead = jest.fn();
  getAbstractFileByPath = jest.fn();
  getFolderByPath = jest.fn();
}

export class FileManager {
  processFrontMatter = jest.fn();
}

export class MetadataCache {
  getFirstLinkpathDest = jest.fn();
}

// ── Plugin base ───────────────────────────────────────────────────────────────

export abstract class Plugin {
  app: any = {};
  manifest: any = { version: '0.0.0', minAppVersion: '0.0.0' };
  loadData = jest.fn().mockResolvedValue({});
  saveData = jest.fn().mockResolvedValue(undefined);
  addCommand = jest.fn();
  addRibbonIcon = jest.fn().mockReturnValue({ addClass: jest.fn() });
  addSettingTab = jest.fn();
}

export abstract class PluginSettingTab {
  containerEl = document.createElement('div');
  constructor(public app: any, public plugin: any) {}
  display(): void {}
}

// ── Editor ────────────────────────────────────────────────────────────────────

export class MarkdownView {
  file = new TFile();
  editor = { replaceRange: jest.fn(), setCursor: jest.fn(), focus: jest.fn() };
}

export class Workspace {
  getActiveViewOfType = jest.fn();
  getLeaf = jest.fn();
}
