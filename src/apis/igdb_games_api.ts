import { requestUrl } from 'obsidian';
import { IGDBGame, IGDBGameFromSearch } from '@models/igdb_game.model';

const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const IGDB_BASE = 'https://api.igdb.com/v4';

interface TwitchTokenResponse {
  access_token: string;
  expires_in: number; // seconds
  token_type: string;
}

const SEARCH_FIELDS = 'fields id,slug,name,first_release_date,cover.url;';

const DETAIL_FIELDS =
  'fields id,slug,name,first_release_date,' +
  'cover.url,' +
  'artworks.url,' +
  'screenshots.url,' +
  'summary,storyline,' +
  'rating,rating_count,' +
  'aggregated_rating,aggregated_rating_count,' +
  'genres.name,genres.slug,' +
  'platforms.name,platforms.slug,platforms.abbreviation,' +
  'themes.name,' +
  'game_modes.name,' +
  'involved_companies.developer,involved_companies.publisher,' +
  'involved_companies.porting,involved_companies.supporting,' +
  'involved_companies.company.name,involved_companies.company.slug,' +
  'websites.url,websites.category,' +
  'external_games.category,external_games.uid,external_games.game,' +
  'alternative_names.name,alternative_names.comment,' +
  'franchise.name,franchises.name,' +
  'url,status,category;';

export class IGDBAPI {
  private accessToken: string | null = null;
  private tokenExpiresAt = 0; // epoch ms

  constructor(private readonly clientId: string, private readonly clientSecret: string) {}

  // ── Auth ──────────────────────────────────────────────────────────────────

  private isTokenValid(): boolean {
    return !!this.accessToken && Date.now() < this.tokenExpiresAt - 60_000;
  }

  async getAccessToken(): Promise<string> {
    if (this.isTokenValid()) return this.accessToken!;

    if (!this.clientId || !this.clientSecret) {
      throw new Error('IGDB Client ID and Client Secret are required');
    }

    const url = new URL(TOKEN_URL);
    url.searchParams.append('client_id', this.clientId);
    url.searchParams.append('client_secret', this.clientSecret);
    url.searchParams.append('grant_type', 'client_credentials');

    try {
      const res = await requestUrl({ url: url.href, method: 'POST' });
      const body = res.json as TwitchTokenResponse;
      this.accessToken = body.access_token;
      this.tokenExpiresAt = Date.now() + body.expires_in * 1000;
      return this.accessToken;
    } catch (error) {
      console.warn('[IGDB Game Searcher][IGDB API][Auth] ' + error);
      throw error;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async post<T>(endpoint: string, body: string): Promise<T> {
    const token = await this.getAccessToken();
    const res = await requestUrl({
      url: `${IGDB_BASE}/${endpoint}`,
      method: 'POST',
      headers: {
        'Client-ID': this.clientId,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body,
    });
    return res.json as T;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Search games by name. Optionally restrict to Steam store entries. */
  async getByQuery(query: string, steam = false): Promise<IGDBGameFromSearch[]> {
    try {
      let apicalypse: string;

      if (steam) {
        // Use external_games to find the IGDB game linked to a Steam entry,
        // then return just the game fields we need.
        apicalypse = `${SEARCH_FIELDS} search "${query}"; where external_games.category = 1; limit 20;`;
      } else {
        apicalypse = `${SEARCH_FIELDS} search "${query}"; limit 20;`;
      }

      const results = await this.post<IGDBGameFromSearch[]>('games', apicalypse);
      return results ?? [];
    } catch (error) {
      console.warn('[IGDB Game Searcher][IGDB API][getByQuery] ' + error);
      throw error;
    }
  }

  /** Fetch a single game's full details by IGDB slug or numeric id. */
  async getBySlugOrId(slugOrId: string | number): Promise<IGDBGame> {
    try {
      const isNumeric = typeof slugOrId === 'number' || /^\d+$/.test(String(slugOrId));
      const whereClause = isNumeric ? `where id = ${slugOrId};` : `where slug = "${slugOrId}";`;

      const apicalypse = `${DETAIL_FIELDS} ${whereClause} limit 1;`;

      const results = await this.post<IGDBGame[]>('games', apicalypse);

      if (!results?.length) {
        throw new Error(`Game not found for: ${slugOrId}`);
      }

      return results[0];
    } catch (error) {
      console.warn('[IGDB Game Searcher][IGDB API][getBySlugOrId] ' + error);
      throw error;
    }
  }

  /**
   * Find the IGDB game linked to a Steam app ID via the external_games endpoint.
   * Returns full game details, or null if not found.
   */
  async getByExternalSteamId(steamAppId: number): Promise<IGDBGame | null> {
    try {
      const apicalypse = `fields game; where uid = "${steamAppId}" & category = 1; limit 1;`;

      const extResults = await this.post<{ game: number }[]>('external_games', apicalypse);

      if (!extResults?.length || !extResults[0]?.game) {
        return null;
      }

      return await this.getBySlugOrId(extResults[0].game);
    } catch (error) {
      console.warn('[IGDB Game Searcher][IGDB API][getByExternalSteamId] ' + error);
      return null;
    }
  }

  /** Validate credentials by attempting to fetch a token. Returns true on success. */
  async testConnection(): Promise<boolean> {
    try {
      // Reset cached token so we always do a fresh check
      this.accessToken = null;
      this.tokenExpiresAt = 0;
      await this.getAccessToken();
      return true;
    } catch {
      return false;
    }
  }
}
