// IGDB API response models
// Reference: https://api-docs.igdb.com/

export interface IGDBListResponse<T> {
  results: T[];
}

/** Lightweight game shape returned from a search query */
export interface IGDBGameFromSearch {
  id: number;
  slug: string;
  name: string;
  first_release_date?: number; // Unix timestamp (seconds)
  cover?: IGDBCover;
}

/** Full game detail shape */
export interface IGDBGame {
  id: number;
  slug: string;
  name: string;
  first_release_date?: number; // Unix timestamp (seconds)
  cover?: IGDBCover;
  artworks?: IGDBImage[];
  screenshots?: IGDBImage[];
  summary?: string;
  storyline?: string;
  rating?: number;
  rating_count?: number;
  aggregated_rating?: number;
  aggregated_rating_count?: number;
  metacritic?: number;
  genres?: IGDBGenre[];
  platforms?: IGDBPlatform[];
  themes?: IGDBTheme[];
  game_modes?: IGDBGameMode[];
  involved_companies?: IGDBInvolvedCompany[];
  websites?: IGDBWebsite[];
  external_games?: IGDBExternalGame[];
  alternative_names?: IGDBAlternativeName[];
  franchise?: IGDBFranchise;
  franchises?: IGDBFranchise[];
  tags?: number[];
  url?: string;
  status?: number; // 0=Released, 2=Alpha, 3=Beta, 4=Early Access, 5=Offline, 6=Cancelled, 7=Rumored
  category?: number; // 0=main_game, 1=dlc, 2=expansion, 3=bundle, 4=standalone_dlc...
}

export interface IGDBCover {
  id: number;
  url: string; // e.g. "//images.igdb.com/igdb/image/upload/t_thumb/co1r76.jpg"
}

export interface IGDBImage {
  id: number;
  url: string;
}

export interface IGDBGenre {
  id: number;
  name: string;
  slug?: string;
}

export interface IGDBPlatform {
  id: number;
  name: string;
  slug?: string;
  abbreviation?: string;
}

export interface IGDBTheme {
  id: number;
  name: string;
  slug?: string;
}

export interface IGDBGameMode {
  id: number;
  name: string;
  slug?: string;
}

export interface IGDBInvolvedCompany {
  id: number;
  company: IGDBCompany;
  developer: boolean;
  publisher: boolean;
  porting: boolean;
  supporting: boolean;
}

export interface IGDBCompany {
  id: number;
  name: string;
  slug?: string;
}

export interface IGDBWebsite {
  id: number;
  url: string;
  category: number; // 1=official, 2=wikia, 3=wikipedia, 13=steam, ...
}

export interface IGDBExternalGame {
  id: number;
  category: number; // 1=steam
  uid: string; // Steam app id as string
  game: number;
}

export interface IGDBAlternativeName {
  id: number;
  name: string;
  comment?: string;
}

export interface IGDBFranchise {
  id: number;
  name: string;
  slug?: string;
}

/** Convert IGDB Unix timestamp (seconds) to a 4-digit year string */
export const releaseYearForIGDBGame = (game: IGDBGameFromSearch | IGDBGame): string => {
  if (!game.first_release_date) return '';
  return new Date(game.first_release_date * 1000).getFullYear().toString();
};

/** Convert IGDB Unix timestamp (seconds) to YYYY-MM-DD string */
export const releaseDateForIGDBGame = (game: IGDBGameFromSearch | IGDBGame): string => {
  if (!game.first_release_date) return '';
  return new Date(game.first_release_date * 1000).toISOString().split('T')[0];
};

/** Normalise a cover URL so it uses https and the "cover_big" size */
export const normalizeCoverUrl = (url?: string): string => {
  if (!url) return '';
  const https = url.startsWith('//') ? 'https:' + url : url;
  return https.replace('/t_thumb/', '/t_cover_big/');
};

/** Flatten an IGDBGame into a plain string-keyed map for {{variable}} template substitution */
export function flattenIGDBGame(game: IGDBGame): Record<string, string> {
  const developers = (game.involved_companies ?? [])
    .filter(c => c.developer)
    .map(c => c.company?.name ?? '')
    .filter(Boolean)
    .join(', ');

  const publishers = (game.involved_companies ?? [])
    .filter(c => c.publisher)
    .map(c => c.company?.name ?? '')
    .filter(Boolean)
    .join(', ');

  const officialSite = game.websites?.find(w => w.category === 1)?.url ?? '';

  const steamUrl = game.websites?.find(w => w.category === 13)?.url ?? '';

  return {
    id: String(game.id ?? ''),
    slug: game.slug ?? '',
    name: game.name ?? '',
    release_date: releaseDateForIGDBGame(game),
    release_year: releaseYearForIGDBGame(game),
    cover_url: normalizeCoverUrl(game.cover?.url),
    summary: game.summary ?? '',
    storyline: game.storyline ?? '',
    rating: game.rating != null ? game.rating.toFixed(1) : '',
    aggregated_rating: game.aggregated_rating != null ? game.aggregated_rating.toFixed(1) : '',
    metacritic: String(game.metacritic ?? ''),
    genres: (game.genres ?? []).map(g => g.name).join(', '),
    platforms: (game.platforms ?? []).map(p => p.name).join(', '),
    themes: (game.themes ?? []).map(t => t.name).join(', '),
    game_modes: (game.game_modes ?? []).map(m => m.name).join(', '),
    developers,
    publishers,
    url: game.url ?? '',
    website: officialSite,
    steam_url: steamUrl,
  };
}
