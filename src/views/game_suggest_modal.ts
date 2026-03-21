import { App, SuggestModal } from 'obsidian';
import { IGDBAPI } from '@src/apis/igdb_games_api';
import { IGDBGame, IGDBGameFromSearch, releaseYearForIGDBGame, normalizeCoverUrl } from '@models/igdb_game.model';

export class GameSuggestModal extends SuggestModal<IGDBGameFromSearch> {
  constructor(
    app: App,
    private api: IGDBAPI,
    private readonly suggestion: IGDBGameFromSearch[],
    private onChoose: (error: Error | null, result?: IGDBGame) => void,
  ) {
    super(app);
  }

  // Returns all available suggestions.
  getSuggestions(_query: string): IGDBGameFromSearch[] {
    return this.suggestion;
  }

  // Renders each suggestion item.
  renderSuggestion(game: IGDBGameFromSearch, el: HTMLElement) {
    el.addClass('igdb-game-searcher__suggest-item');

    const coverUrl = normalizeCoverUrl(game.cover?.url);
    if (coverUrl) {
      const img = el.createEl('img', { cls: 'igdb-game-searcher__suggest-cover' });
      img.src = coverUrl;
      img.alt = game.name;
    } else {
      el.createEl('div', { cls: 'igdb-game-searcher__suggest-cover igdb-game-searcher__suggest-cover--placeholder' });
    }

    const info = el.createEl('div', { cls: 'igdb-game-searcher__suggest-info' });
    info.createEl('span', { text: game.name, cls: 'igdb-game-searcher__suggest-title' });
    if (game.first_release_date) {
      info.createEl('small', { text: releaseYearForIGDBGame(game), cls: 'igdb-game-searcher__suggest-year' });
    }
  }

  // Perform action on the selected suggestion.
  async onChooseSuggestion(game: IGDBGameFromSearch) {
    const g = await this.api.getBySlugOrId(game.slug ?? game.id);
    this.onChoose(null, g);
  }
}
