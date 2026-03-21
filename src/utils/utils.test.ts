import {
  replaceIllegalFileNameCharactersInString,
  makeFileName,
  replaceVariableSyntax,
  camelToSnakeCase,
  mapToString,
  stringToMap,
} from './utils';
import type { IGDBGame } from '@models/igdb_game.model';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGame(overrides: Partial<IGDBGame> = {}): IGDBGame {
  return {
    id: 42,
    slug: 'halo-combat-evolved',
    name: 'Halo: Combat Evolved',
    first_release_date: 1005782400, // 2001-11-15
    ...overrides,
  };
}

// ── replaceIllegalFileNameCharactersInString ──────────────────────────────────

describe('replaceIllegalFileNameCharactersInString', () => {
  it('strips illegal characters', () => {
    expect(replaceIllegalFileNameCharactersInString('Hello: World?')).toBe('Hello World');
    expect(replaceIllegalFileNameCharactersInString('A/B\\C')).toBe('ABC');
    expect(replaceIllegalFileNameCharactersInString('File|Name')).toBe('FileName');
    expect(replaceIllegalFileNameCharactersInString('a[b]c')).toBe('abc');
  });

  it('collapses multiple spaces into one', () => {
    expect(replaceIllegalFileNameCharactersInString('hello   world')).toBe('hello world');
  });

  it('leaves safe characters unchanged', () => {
    expect(replaceIllegalFileNameCharactersInString('Normal Title (2001)')).toBe('Normal Title (2001)');
  });
});

// ── makeFileName ──────────────────────────────────────────────────────────────

describe('makeFileName', () => {
  it('defaults to "Name (Year).md" format', () => {
    expect(makeFileName(makeGame())).toBe('Halo Combat Evolved (2001).md');
  });

  it('falls back to just the name when release date is absent', () => {
    expect(makeFileName(makeGame({ first_release_date: undefined }))).toBe('Halo Combat Evolved.md');
  });

  it('applies a custom fileNameFormat', () => {
    expect(makeFileName(makeGame(), '{{name}}')).toBe('Halo Combat Evolved.md');
  });

  it('strips illegal characters from the generated name', () => {
    const game = makeGame({ name: 'Halo: Combat Evolved' });
    expect(makeFileName(game)).toBe('Halo Combat Evolved (2001).md');
  });
});

// ── replaceVariableSyntax ─────────────────────────────────────────────────────

describe('replaceVariableSyntax', () => {
  it('replaces {{name}}', () => {
    expect(replaceVariableSyntax(makeGame(), 'title: {{name}}')).toBe('title: Halo: Combat Evolved');
  });

  it('replaces {{release_year}}', () => {
    expect(replaceVariableSyntax(makeGame(), '{{release_year}}')).toBe('2001');
  });

  it('replaces {{release_date}}', () => {
    expect(replaceVariableSyntax(makeGame(), '{{release_date}}')).toBe('2001-11-15');
  });

  it('replaces {{slug}}', () => {
    expect(replaceVariableSyntax(makeGame(), '{{slug}}')).toBe('halo-combat-evolved');
  });

  it('replaces {{genres}} with comma-separated names', () => {
    const game = makeGame({
      genres: [
        { id: 1, name: 'Shooter' },
        { id: 5, name: 'Action' },
      ],
    });
    expect(replaceVariableSyntax(game, '{{genres}}')).toBe('Shooter, Action');
  });

  it('replaces {{developers}} from involved_companies', () => {
    const game = makeGame({
      involved_companies: [
        {
          id: 1,
          company: { id: 10, name: 'Bungie' },
          developer: true,
          publisher: false,
          porting: false,
          supporting: false,
        },
      ],
    });
    expect(replaceVariableSyntax(game, '{{developers}}')).toBe('Bungie');
  });

  it('removes unknown {{tokens}}', () => {
    expect(replaceVariableSyntax(makeGame(), '{{nonexistent_field}}')).toBe('');
  });

  it('returns empty string for empty template', () => {
    expect(replaceVariableSyntax(makeGame(), '')).toBe('');
    expect(replaceVariableSyntax(makeGame(), '   ')).toBe('');
  });

  it('handles multiple replacements in one template string', () => {
    const result = replaceVariableSyntax(makeGame(), '# {{name}}\nReleased: {{release_year}}');
    expect(result).toBe('# Halo: Combat Evolved\nReleased: 2001');
  });

  it('is case-insensitive for token names', () => {
    expect(replaceVariableSyntax(makeGame(), '{{NAME}}')).toBe('Halo: Combat Evolved');
  });
});

// ── camelToSnakeCase ──────────────────────────────────────────────────────────

describe('camelToSnakeCase', () => {
  it('converts camelCase to snake_case', () => {
    expect(camelToSnakeCase('firstName')).toBe('first_name');
    expect(camelToSnakeCase('releaseDate')).toBe('release_date');
    expect(camelToSnakeCase('aggregatedRating')).toBe('aggregated_rating');
  });

  it('leaves already lowercase strings unchanged', () => {
    expect(camelToSnakeCase('name')).toBe('name');
    expect(camelToSnakeCase('slug')).toBe('slug');
  });
});

// ── mapToString ───────────────────────────────────────────────────────────────

describe('mapToString', () => {
  it('serialises a map to "key: value" lines', () => {
    const m = new Map([
      ['owned', 'true'],
      ['platform', 'steam'],
    ]);
    expect(mapToString(m)).toBe('owned: true\nplatform: steam');
  });

  it('returns empty string for an empty map', () => {
    expect(mapToString(new Map())).toBe('');
  });

  it('returns empty string for null/undefined', () => {
    expect(mapToString(null as any)).toBe('');
    expect(mapToString(undefined as any)).toBe('');
  });
});

// ── stringToMap ───────────────────────────────────────────────────────────────

describe('stringToMap', () => {
  it('parses "key: value" lines into a Map', () => {
    const m = stringToMap('owned: true\nplatform: steam');
    expect(m.get('owned')).toBe('true');
    expect(m.get('platform')).toBe('steam');
  });

  it('handles values that contain colons', () => {
    const m = stringToMap('url: https://example.com/path');
    expect(m.get('url')).toBe('https://example.com/path');
  });

  it('trims whitespace from keys and values', () => {
    const m = stringToMap('  key  :  value  ');
    expect(m.get('key')).toBe('value');
  });

  it('returns an empty map for empty input', () => {
    expect(stringToMap('').size).toBe(0);
    expect(stringToMap(null as any).size).toBe(0);
  });

  it('ignores lines without a colon', () => {
    const m = stringToMap('no colon here\nkey: value');
    expect(m.size).toBe(1);
    expect(m.get('key')).toBe('value');
  });

  it('round-trips with mapToString', () => {
    const original = new Map([
      ['status', 'playing'],
      ['rating', '9'],
    ]);
    const parsed = stringToMap(mapToString(original));
    expect(parsed).toEqual(original);
  });
});
