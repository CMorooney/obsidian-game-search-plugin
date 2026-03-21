import { IGDBGame, IGDBGameFromSearch, flattenIGDBGame, releaseYearForIGDBGame } from '@models/igdb_game.model';

// == Format Syntax == //
export const NUMBER_REGEX = /^-?[0-9]*$/;
export const DATE_REGEX = /{{DATE(\+-?[0-9]+)?}}/;
export const DATE_REGEX_FORMATTED = /{{DATE:([^}\n\r+]*)(\+-?[0-9]+)?}}/;

export function replaceIllegalFileNameCharactersInString(text: string) {
  return text.replace(/[[\]\\/:?|^#]/g, '').replace(/\s+/g, ' ');
}

export function makeFileName(game: IGDBGame | IGDBGameFromSearch, fileNameFormat?: string) {
  let result;
  if (fileNameFormat) {
    result = replaceVariableSyntax(game, replaceDateInString(fileNameFormat));
  } else {
    const year = releaseYearForIGDBGame(game);
    result = year ? `${game.name} (${year})` : game.name;
  }
  return replaceIllegalFileNameCharactersInString(result) + '.md';
}

export function changeSnakeCase(game: IGDBGame | IGDBGameFromSearch) {
  return Object.entries(game).reduce((acc, [key, value]) => {
    acc[camelToSnakeCase(key)] = value;
    return acc;
  }, {});
}

export function replaceVariableSyntax(game: IGDBGame | IGDBGameFromSearch, text: string): string {
  if (!text?.trim()) {
    return '';
  }

  // Flatten nested IGDB fields into a simple string map for {{variable}} substitution
  const flatGame = flattenIGDBGame(game as IGDBGame);

  // Also include raw top-level scalar fields so advanced templates can reference e.g. {{id}}
  const combined: Record<string, string> = { ...flatGame };
  for (const [key, val] of Object.entries(game)) {
    if (!(key in combined) && typeof val !== 'object') {
      combined[key] = String(val ?? '');
    }
  }

  return Object.entries(combined)
    .reduce((result, [key, val]) => {
      return result.replace(new RegExp(`{{${key}}}`, 'ig'), val ?? '');
    }, text)
    .replace(/{{\w+}}/gi, '')
    .trim();
}

export function camelToSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter?.toLowerCase()}`);
}

export function getDate(input?: { format?: string; offset?: number }) {
  let duration;

  if (input?.offset !== null && input?.offset !== undefined && typeof input.offset === 'number') {
    duration = window.moment.duration(input.offset, 'days');
  }

  return input?.format
    ? window.moment().add(duration).format(input?.format)
    : window.moment().add(duration).format('YYYY-MM-DD');
}

export function replaceDateInString(input: string) {
  let output: string = input;

  while (DATE_REGEX.test(output)) {
    const dateMatch = DATE_REGEX.exec(output);
    let offset = 0;

    if (dateMatch?.[1]) {
      const offsetString = dateMatch[1].replace('+', '').trim();
      const offsetIsInt = NUMBER_REGEX.test(offsetString);
      if (offsetIsInt) offset = parseInt(offsetString);
    }
    output = replacer(output, DATE_REGEX, getDate({ offset }));
  }

  while (DATE_REGEX_FORMATTED.test(output)) {
    const dateMatch = DATE_REGEX_FORMATTED.exec(output);
    const format = dateMatch?.[1];
    let offset = 0;

    if (dateMatch?.[2]) {
      const offsetString = dateMatch[2].replace('+', '').trim();
      const offsetIsInt = NUMBER_REGEX.test(offsetString);
      if (offsetIsInt) offset = parseInt(offsetString);
    }

    output = replacer(output, DATE_REGEX_FORMATTED, getDate({ format, offset }));
  }

  return output;
}

function replacer(str: string, reg: RegExp, replaceValue) {
  return str.replace(reg, function () {
    return replaceValue;
  });
}

export function mapToString(m: Map<string, string>): string {
  if (!m || m.size <= 0 || !(m instanceof Map)) return '';
  let s = '';
  for (const [key, value] of m) {
    s += key + ': ' + value + '\n';
  }
  return s.trim();
}

export function stringToMap(s: string): Map<string, string> {
  const m = new Map<string, string>();
  if (!s) return m;
  const lines = s.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(':')) {
      // Split on the first colon
      const components = lines[i].split(/:(.+)/);
      if (components[0] && components[1] && components[0].trim() && components[1].trim()) {
        m.set(components[0].trim(), components[1].trim());
      }
    }
  }
  return m;
}
