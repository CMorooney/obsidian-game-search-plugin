import { releaseYearForIGDBGame, releaseDateForIGDBGame, normalizeCoverUrl, flattenIGDBGame } from './igdb_game.model';
import type { IGDBGame } from './igdb_game.model';

// Unix timestamps used across tests
// 2001-11-15 = 1005782400  (Halo: Combat Evolved release date)
// 1994-09-30 = 780969600
const HALO_RELEASE_TS = 1005782400; // 2001-11-15

function makeGame(overrides: Partial<IGDBGame> = {}): IGDBGame {
  return {
    id: 1,
    slug: 'halo-combat-evolved',
    name: 'Halo: Combat Evolved',
    first_release_date: HALO_RELEASE_TS,
    ...overrides,
  };
}

// ── releaseYearForIGDBGame ────────────────────────────────────────────────────

describe('releaseYearForIGDBGame', () => {
  it('returns the 4-digit year string for a known timestamp', () => {
    expect(releaseYearForIGDBGame(makeGame())).toBe('2001');
  });

  it('returns empty string when first_release_date is missing', () => {
    expect(releaseYearForIGDBGame(makeGame({ first_release_date: undefined }))).toBe('');
  });

  it('returns correct year for a 1990s game', () => {
    // 1994-09-30 00:00:00 UTC → 780969600
    expect(releaseYearForIGDBGame(makeGame({ first_release_date: 780969600 }))).toBe('1994');
  });
});

// ── releaseDateForIGDBGame ────────────────────────────────────────────────────

describe('releaseDateForIGDBGame', () => {
  it('returns YYYY-MM-DD string', () => {
    // 2001-11-15T00:00:00.000Z
    expect(releaseDateForIGDBGame(makeGame())).toBe('2001-11-15');
  });

  it('returns empty string when first_release_date is missing', () => {
    expect(releaseDateForIGDBGame(makeGame({ first_release_date: undefined }))).toBe('');
  });
});

// ── normalizeCoverUrl ─────────────────────────────────────────────────────────

describe('normalizeCoverUrl', () => {
  it('converts protocol-relative URL to https', () => {
    const input = '//images.igdb.com/igdb/image/upload/t_thumb/co1r76.jpg';
    expect(normalizeCoverUrl(input)).toMatch(/^https:/);
  });

  it('replaces t_thumb with t_cover_big', () => {
    const input = '//images.igdb.com/igdb/image/upload/t_thumb/co1r76.jpg';
    expect(normalizeCoverUrl(input)).toContain('/t_cover_big/');
    expect(normalizeCoverUrl(input)).not.toContain('/t_thumb/');
  });

  it('leaves an already-https URL unchanged except for size', () => {
    const input = 'https://images.igdb.com/igdb/image/upload/t_thumb/co1r76.jpg';
    expect(normalizeCoverUrl(input)).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big/co1r76.jpg');
  });

  it('returns empty string for undefined input', () => {
    expect(normalizeCoverUrl(undefined)).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(normalizeCoverUrl('')).toBe('');
  });
});

// ── flattenIGDBGame ───────────────────────────────────────────────────────────

describe('flattenIGDBGame', () => {
  it('flattens scalar fields', () => {
    const flat = flattenIGDBGame(makeGame({ summary: 'A great game', rating: 88.5 }));
    expect(flat.name).toBe('Halo: Combat Evolved');
    expect(flat.slug).toBe('halo-combat-evolved');
    expect(flat.summary).toBe('A great game');
    expect(flat.rating).toBe('88.5');
    expect(flat.id).toBe('1');
  });

  it('produces release_date and release_year', () => {
    const flat = flattenIGDBGame(makeGame());
    expect(flat.release_year).toBe('2001');
    expect(flat.release_date).toBe('2001-11-15');
  });

  it('flattens genres to comma-separated names', () => {
    const flat = flattenIGDBGame(
      makeGame({
        genres: [
          { id: 1, name: 'Shooter' },
          { id: 5, name: 'Action' },
        ],
      }),
    );
    expect(flat.genres).toBe('Shooter, Action');
  });

  it('flattens platforms to comma-separated names', () => {
    const flat = flattenIGDBGame(
      makeGame({
        platforms: [
          { id: 6, name: 'PC' },
          { id: 49, name: 'Xbox' },
        ],
      }),
    );
    expect(flat.platforms).toBe('PC, Xbox');
  });

  it('separates developers and publishers from involved_companies', () => {
    const flat = flattenIGDBGame(
      makeGame({
        involved_companies: [
          {
            id: 1,
            company: { id: 10, name: 'Bungie' },
            developer: true,
            publisher: false,
            porting: false,
            supporting: false,
          },
          {
            id: 2,
            company: { id: 11, name: 'Microsoft' },
            developer: false,
            publisher: true,
            porting: false,
            supporting: false,
          },
        ],
      }),
    );
    expect(flat.developers).toBe('Bungie');
    expect(flat.publishers).toBe('Microsoft');
  });

  it('extracts official website (category 1)', () => {
    const flat = flattenIGDBGame(makeGame({ websites: [{ id: 1, url: 'https://halo.bungie.net', category: 1 }] }));
    expect(flat.website).toBe('https://halo.bungie.net');
  });

  it('extracts steam URL (category 13)', () => {
    const flat = flattenIGDBGame(
      makeGame({ websites: [{ id: 2, url: 'https://store.steampowered.com/app/976730', category: 13 }] }),
    );
    expect(flat.steam_url).toBe('https://store.steampowered.com/app/976730');
  });

  it('normalises cover URL', () => {
    const flat = flattenIGDBGame(
      makeGame({ cover: { id: 1, url: '//images.igdb.com/igdb/image/upload/t_thumb/co1r76.jpg' } }),
    );
    expect(flat.cover_url).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big/co1r76.jpg');
  });

  it('returns empty strings for missing optional fields', () => {
    const flat = flattenIGDBGame(makeGame());
    expect(flat.genres).toBe('');
    expect(flat.developers).toBe('');
    expect(flat.cover_url).toBe('');
    expect(flat.website).toBe('');
  });
});
