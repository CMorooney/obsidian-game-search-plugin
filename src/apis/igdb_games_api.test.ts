import { IGDBAPI } from './igdb_games_api';
import { requestUrl } from 'obsidian';

const mockRequestUrl = requestUrl as jest.Mock;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TOKEN_RESPONSE = { access_token: 'test-token-abc', expires_in: 3600 };

const GAME_FROM_SEARCH = {
  id: 1,
  slug: 'halo-combat-evolved',
  name: 'Halo: Combat Evolved',
  first_release_date: 1005782400,
};
const GAME_FULL = { ...GAME_FROM_SEARCH, summary: 'A masterpiece FPS', genres: [{ id: 5, name: 'Shooter' }] };

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockToken() {
  mockRequestUrl.mockResolvedValueOnce({ json: TOKEN_RESPONSE });
}

function mockJson(data: unknown) {
  mockRequestUrl.mockResolvedValueOnce({ json: data });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('IGDBAPI', () => {
  let api: IGDBAPI;

  beforeEach(() => {
    api = new IGDBAPI('client-id', 'client-secret');
    mockRequestUrl.mockReset();
  });

  // ── getAccessToken ──────────────────────────────────────────────────────────

  describe('getAccessToken', () => {
    it('fetches a token from the Twitch endpoint', async () => {
      mockToken();
      const token = await api.getAccessToken();
      expect(token).toBe('test-token-abc');
      expect(mockRequestUrl).toHaveBeenCalledTimes(1);
      const call = mockRequestUrl.mock.calls[0][0];
      expect(call.url).toContain('id.twitch.tv/oauth2/token');
      expect(call.url).toContain('client_id=client-id');
    });

    it('caches the token and avoids duplicate network calls', async () => {
      mockToken();
      await api.getAccessToken();
      await api.getAccessToken();
      expect(mockRequestUrl).toHaveBeenCalledTimes(1); // still 1
    });

    it('throws when clientId or clientSecret are empty', async () => {
      const empty = new IGDBAPI('', '');
      await expect(empty.getAccessToken()).rejects.toThrow('IGDB Client ID and Client Secret are required');
    });
  });

  // ── getByQuery ──────────────────────────────────────────────────────────────

  describe('getByQuery', () => {
    beforeEach(() => mockToken());

    it('returns search results', async () => {
      mockJson([GAME_FROM_SEARCH]);
      const results = await api.getByQuery('halo');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Halo: Combat Evolved');
    });

    it('returns an empty array when the API returns null', async () => {
      mockJson(null);
      expect(await api.getByQuery('zzz-nothing')).toEqual([]);
    });

    it('sends the search term in the request body', async () => {
      mockJson([]);
      await api.getByQuery('halo');
      const body: string = mockRequestUrl.mock.calls[1][0].body;
      expect(body).toContain('search "halo"');
    });

    it('adds the Steam filter when steam=true', async () => {
      mockJson([]);
      await api.getByQuery('halo', true);
      const body: string = mockRequestUrl.mock.calls[1][0].body;
      expect(body).toContain('external_games.category = 1');
    });

    it('does NOT add the Steam filter when steam=false (default)', async () => {
      mockJson([]);
      await api.getByQuery('halo');
      const body: string = mockRequestUrl.mock.calls[1][0].body;
      expect(body).not.toContain('external_games');
    });

    it('sends the correct IGDB Authorization header', async () => {
      mockJson([]);
      await api.getByQuery('halo');
      const headers = mockRequestUrl.mock.calls[1][0].headers;
      expect(headers['Authorization']).toBe('Bearer test-token-abc');
      expect(headers['Client-ID']).toBe('client-id');
    });

    it('re-throws errors', async () => {
      mockRequestUrl.mockRejectedValueOnce(new Error('network error'));
      await expect(api.getByQuery('halo')).rejects.toThrow('network error');
    });
  });

  // ── getBySlugOrId ───────────────────────────────────────────────────────────

  describe('getBySlugOrId', () => {
    beforeEach(() => mockToken());

    it('queries by slug using where slug = "..."', async () => {
      mockJson([GAME_FULL]);
      await api.getBySlugOrId('halo-combat-evolved');
      const body: string = mockRequestUrl.mock.calls[1][0].body;
      expect(body).toContain('where slug = "halo-combat-evolved"');
    });

    it('queries by numeric id using where id = N', async () => {
      mockJson([GAME_FULL]);
      await api.getBySlugOrId(42);
      const body: string = mockRequestUrl.mock.calls[1][0].body;
      expect(body).toContain('where id = 42');
    });

    it('queries by numeric string using where id = N', async () => {
      mockJson([GAME_FULL]);
      await api.getBySlugOrId('42');
      const body: string = mockRequestUrl.mock.calls[1][0].body;
      expect(body).toContain('where id = 42');
    });

    it('returns the first result', async () => {
      mockJson([GAME_FULL]);
      const result = await api.getBySlugOrId('halo-combat-evolved');
      expect(result.id).toBe(1);
      expect(result.slug).toBe('halo-combat-evolved');
    });

    it('throws when no results are found', async () => {
      mockJson([]);
      await expect(api.getBySlugOrId('not-a-real-game')).rejects.toThrow('Game not found');
    });
  });

  // ── getByExternalSteamId ────────────────────────────────────────────────────

  describe('getByExternalSteamId', () => {
    beforeEach(() => mockToken());

    it('returns null when the steam id has no IGDB match', async () => {
      mockJson([]); // external_games query returns nothing
      const result = await api.getByExternalSteamId(99999);
      expect(result).toBeNull();
    });

    it('fetches full game details when a match is found', async () => {
      mockJson([{ game: 5 }]); // external_games response
      mockJson([{ id: 5, slug: 'halo', name: 'Halo' }]); // games response (getBySlugOrId)
      const result = await api.getByExternalSteamId(570);
      expect(result?.id).toBe(5);
      expect(result?.name).toBe('Halo');
    });

    it('queries the external_games endpoint with the steam app id', async () => {
      mockJson([]);
      await api.getByExternalSteamId(570);
      const url: string = mockRequestUrl.mock.calls[1][0].url;
      expect(url).toContain('external_games');
      const body: string = mockRequestUrl.mock.calls[1][0].body;
      expect(body).toContain('"570"');
      expect(body).toContain('category = 1');
    });

    it('returns null and does not throw when an error occurs', async () => {
      mockRequestUrl.mockRejectedValueOnce(new Error('IGDB unavailable'));
      const result = await api.getByExternalSteamId(1);
      expect(result).toBeNull();
    });
  });

  // ── testConnection ──────────────────────────────────────────────────────────

  describe('testConnection', () => {
    it('returns true when token fetch succeeds', async () => {
      mockToken();
      expect(await api.testConnection()).toBe(true);
    });

    it('returns false when token fetch fails', async () => {
      mockRequestUrl.mockRejectedValueOnce(new Error('Unauthorized'));
      expect(await api.testConnection()).toBe(false);
    });

    it('always re-fetches the token (ignores cache)', async () => {
      mockToken(); // first testConnection
      await api.testConnection();
      mockToken(); // second testConnection
      await api.testConnection();
      // Two separate token fetches should have happened
      expect(mockRequestUrl).toHaveBeenCalledTimes(2);
    });
  });
});
