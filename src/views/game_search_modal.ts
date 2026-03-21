import { ButtonComponent, Modal, Setting, TextComponent, Notice } from 'obsidian';
import { IGDBAPI } from '@src/apis/igdb_games_api';
import { IGDBGameFromSearch } from '@models/igdb_game.model';
import IGDBGameSearcherPlugin from '@src/main';

export class IGDBGameSearcherSearchModal extends Modal {
  private isBusy = false;
  private okBtnRef?: ButtonComponent;

  constructor(
    plugin: IGDBGameSearcherPlugin,
    private api: IGDBAPI,
    private query: string,
    private callback: (error: Error | null, result?: IGDBGameFromSearch[]) => void,
  ) {
    super(plugin.app);
  }

  setBusy(busy: boolean) {
    this.isBusy = busy;
    this.okBtnRef?.setDisabled(busy);
    this.okBtnRef?.setButtonText(busy ? 'Requesting...' : 'Search');
  }

  async searchGame() {
    if (!this.query) {
      throw new Error('No query entered.');
    }

    if (!this.isBusy) {
      try {
        this.setBusy(true);
        const searchResults = await this.api.getByQuery(this.query);
        this.setBusy(false);

        if (!searchResults?.length) {
          new Notice(`No results found for "${this.query}"`); // Couldn't find the game.
          return;
        }

        this.callback(null, searchResults);
      } catch (err) {
        this.callback(err as Error);
      }
      this.close();
    }
  }

  submitEnterCallback(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.isComposing) {
      this.searchGame();
    }
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: 'Search Game' });

    contentEl.createDiv({ cls: 'igdb-game-searcher__search-modal--input' }, settingItem => {
      new TextComponent(settingItem)
        .setValue(this.query)
        .setPlaceholder('Search by title')
        .onChange(value => (this.query = value))
        .inputEl.addEventListener('keydown', this.submitEnterCallback.bind(this));
    });

    new Setting(contentEl).addButton(btn => {
      return (this.okBtnRef = btn
        .setButtonText('Search')
        .setCta()
        .onClick(() => {
          this.searchGame();
        }));
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
