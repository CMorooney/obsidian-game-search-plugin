import { TFile, Notice, Vault, FileManager, normalizePath } from 'obsidian';
import { extract } from 'fuzzball';
import { IGDBGameSearcherSettings } from '@settings/settings';
import type { Nullable } from '../main';
import { SteamAPI } from '@src/apis/steam_api';
import { IGDBAPI } from '@src/apis/igdb_games_api';
import { makeFileName, stringToMap } from '@utils/utils';
import { IGDBGame, IGDBGameFromSearch } from '@models/igdb_game.model';

type CreateGameFunc = (
  params: {
    game: IGDBGame;
    steamId: number;
    steamPlaytimeForever: number;
    steamPlaytime2Weeks: number;
    overwriteFile: boolean;
  },
  openAfterCreate: boolean,
  extraData?: Map<string, string>,
) => Promise<void>;

export async function findAndSyncSteamGame(
  vault: Vault,
  settings: any,
  fileManager: FileManager,
  igdbApi: IGDBAPI,
  name: string,
  steamId: number,
  steamPlaytimeForever: number,
  steamPlaytime2Weeks: number,
  createNewGameNote: CreateGameFunc,
  metadata: Map<string, string>,
  logDescription: string,
): Promise<void> {
  // First try precise lookup by Steam App ID via IGDB external_games
  let igdbGame: Nullable<IGDBGame> = await igdbApi.getByExternalSteamId(steamId).catch(() => null);

  // Fall back to fuzzy name search if exact match fails
  if (!igdbGame) {
    let igdbGameFromSearch: Nullable<IGDBGameFromSearch>;
    try {
      const igdbGames = await igdbApi.getByQuery(name, true);
      const results = extract(name, igdbGames, { processor: g => g.name, limit: 1, cutoff: 80, returnObjects: true });
      igdbGameFromSearch = results?.[0]?.choice;
    } catch (igdbApiError) {
      console.warn('[IGDB Game Searcher][Steam Sync][ERROR] getting IGDB game for ' + logDescription + ' game ' + name);
      console.warn(igdbApiError);
    }

    if (igdbGameFromSearch) {
      try {
        igdbGame = await igdbApi.getBySlugOrId(igdbGameFromSearch.slug ?? igdbGameFromSearch.id);
      } catch (detailError) {
        console.warn('[IGDB Game Searcher][Steam Sync][ERROR] getting IGDB details for ' + name);
        console.warn(detailError);
      }
    }
  }

  if (!igdbGame) {
    new Notice('Unable to sync ' + logDescription + ' game ' + name);
    console.warn('[IGDB Game Searcher][Steam Sync] SKIPPING! ' + name);
    return;
  }

  const possibleExistingFilePath = makeFileName(igdbGame, settings.fileNameFormat);
  const existingGameFile = vault.getAbstractFileByPath(
    normalizePath(settings.folder + '/' + possibleExistingFilePath),
  ) as TFile;

  if (existingGameFile) {
    console.info(
      '[IGDB Game Searcher][Steam Sync]: found match for vault file: ' +
        existingGameFile.name +
        ' and ' +
        logDescription +
        ' game: ' +
        name,
    );

    fileManager.processFrontMatter(existingGameFile, data => {
      data.steamId = steamId;
      data.steamPlaytimeForever = steamPlaytimeForever;
      data.steamPlaytime2Weeks = steamPlaytime2Weeks;
      if (metadata && metadata instanceof Map) {
        for (const [key, value] of metadata) {
          data[key.trim()] = value.trim();
        }
      }
      return data;
    });
  } else {
    console.info('[IGDB Game Searcher][Steam Sync] creating note for ' + name);
    try {
      await createNewGameNote(
        {
          game: igdbGame,
          steamId: steamId,
          steamPlaytimeForever: steamPlaytimeForever,
          steamPlaytime2Weeks: steamPlaytime2Weeks,
          overwriteFile: false,
        },
        false,
        metadata,
      );
    } catch (writeError) {
      console.warn('[IGDB Game Searcher][Steam Sync][ERROR] writing file for steam game ' + name);
      console.warn(writeError);
    }
  }
}

export async function syncSteamWishlist(
  vault: Vault,
  settings: any,
  fileManager: FileManager,
  igdbApi: IGDBAPI,
  steamApi: SteamAPI,
  createNewGameNote: CreateGameFunc,
  processedPercent: (percent: number) => void,
): Promise<void> {
  if (!steamApi) return;
  console.info('[IGDB Game Searcher][Steam Sync]: fetching wishlist from steam api');
  const wishlistGames = await steamApi.getWishlist();
  let index = 0;
  const amount = wishlistGames.size;

  for (const [key, value] of wishlistGames) {
    await findAndSyncSteamGame(
      vault,
      settings,
      fileManager,
      igdbApi,
      value.name,
      key,
      0,
      0,
      createNewGameNote,
      stringToMap(settings.metaDataForWishlistedSteamGames),
      'wishlisted steam',
    );
    processedPercent(++index / amount);
  }
}

export async function syncOwnedSteamGames(
  vault: Vault,
  settings: IGDBGameSearcherSettings,
  fileManager: FileManager,
  igdbApi: IGDBAPI,
  steamApi: SteamAPI,
  createNewGameNote: CreateGameFunc,
  processedPercent: (percent: number) => void,
): Promise<void> {
  if (!steamApi) return;
  console.info('[IGDB Game Searcher][Steam Sync]: fetching owned games from steam api');
  const ownedSteamGames = await steamApi.getOwnedGames();

  console.info('[IGDB Game Searcher][Steam Sync]: begin steam game directory iteration');
  let index = 0;
  const amount = ownedSteamGames.length;

  for (let i = 0; i < ownedSteamGames.length; i++) {
    const steamGame = ownedSteamGames[i];
    await findAndSyncSteamGame(
      vault,
      settings,
      fileManager,
      igdbApi,
      steamGame.name,
      steamGame.appid,
      steamGame.playtime_forever,
      steamGame.playtime_2weeks,
      createNewGameNote,
      stringToMap(settings.metaDataForOwnedSteamGames),
      'owned steam',
    );
    processedPercent(++index / amount);
  }
}

export async function syncPlaytimes(
  vault: Vault,
  fileManager: FileManager,
  steamApi: SteamAPI,
  settings: any,
): Promise<void> {
  const folderPath = normalizePath(settings.folder);
  const folder = vault.getFolderByPath(folderPath);
  const ids: string[] = [];

  const doForChild = async (func: (file: TFile) => Promise<void>) => {
    for (const f of folder.children) {
      const file = f as TFile;
      if (!!file && file.name.includes('.md')) {
        await func(file);
      }
    }
  };

  const playerStats = await steamApi.getPlayerStatsForGames(ids);
  if (playerStats) {
    doForChild(async file => {
      fileManager.processFrontMatter(file, data => {
        if (data.steamId && playerStats[data.steamId]) {
          data.steamPlaytimeForever = playerStats[data.steamId].playtime_forever;
          data.steamPlaytime2Weeks = playerStats[data.steamId].playtime_2weeks;
        }
        return data;
      });
    });
  }
}

export async function syncAchievements(
  vault: Vault,
  fileManager: FileManager,
  steamApi: SteamAPI,
  settings: any,
): Promise<void> {
  const folderPath = normalizePath(settings.folder);
  const folder = vault.getFolderByPath(folderPath);

  const doForChild = async (func: (file: TFile) => Promise<void>) => {
    for (const f of folder.children) {
      const file = f as TFile;
      if (!!file && file.name.includes('.md')) {
        await func(file);
      }
    }
  };

  doForChild(async file => {
    fileManager.processFrontMatter(file, async data => {
      if (data.steamId) {
        await steamApi.getPlayerAchievmentsForGame(data.steamId);
      }
    });
  });
}
