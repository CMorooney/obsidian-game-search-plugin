# IGDB Game Searcher

- [How to Install](#how-to-install)
- [Basic Usage](#basic-usage)
- [Steam Sync](#steam-sync)
- [Templating](#templating)
  - [Example Template](#example-template)
  - [Template Variables](#template-variables)
  - [Inline Scripts](#inline-scripts)
  - [Regenerating File Metadata](#regenerating-file-metadata)

## Description

Search for games by title and automatically create notes with metadata fetched from the [IGDB API](https://api-docs.igdb.com/). Optionally sync your Steam library and wishlist.

## How to Install

Search **IGDB Game Searcher** in the Obsidian Community plugin directory and install from there.

Or use this direct install link: [Install Link](https://github.com/CMorooney/obsidian-game-search-plugin)

## Basic Usage

1. Create a Twitch Developer application at [dev.twitch.tv](https://dev.twitch.tv/console/apps) to get a **Client ID** and **Client Secret** (IGDB is owned by Twitch)
2. Enter both credentials in the Game Search plugin settings
3. Use the **Test Connection** button to verify your credentials
4. Select a folder for your game notes
5. Set a file name format (e.g. `{{name}} ({{release_year}})`)
6. Select a template file
7. Run the command **Create new game note**, search for a game, and pick from results

## Steam Sync

Optionally sync your Steam library and wishlist to automatically create or update game notes.

1. Acquire a Steam Web API key from [steamcommunity.com/dev](https://steamcommunity.com/dev)
2. Find your Steam user ID (navigate to your profile in a browser and check the URL)
3. Enter your Steam API key and user ID in the plugin settings
4. Ensure your Steam Privacy Settings have your **Wishlist** set to `Public` if you want to sync it
5. (Optional) define metadata key/value pairs to inject into owned or wishlisted games — e.g. `status: backlog` for wishlist, `owned_platform: steam` for owned games
6. Run the command **Sync Steam** — this may take a while for large libraries; a progress bar is shown
7. **Important**: synced notes will have `steamId`, `steamPlaytimeForever`, and `steamPlaytime2Weeks` metadata added automatically. Do not remove `steamId` from notes you want to keep synced.

The Steam sync uses the IGDB `external_games` endpoint for precise matching by Steam App ID, falling back to fuzzy name matching when a direct match isn't found.

## Templating

It is recommended to pair this plugin with [Templater](https://github.com/SilentVoid13/Templater) to auto-generate content for your notes.

### Example Template

```markdown
---
tags: game
status:
  - wishlist
format:
  - digital
owned_platform:
  - pc
id: "{{id}}"
name: "{{name}}"
igdb_url: "{{url}}"
release_date: "{{release_date}}"
cover_url: "{{cover_url}}"
rating: "{{rating}}"
aggregated_rating: "{{aggregated_rating}}"
steam_url: "{{steam_url}}"
website: "{{website}}"
genres:
<%= game.genres?.filter(g => typeof g === 'object' && g.name).map(g => `  - "${g.name}"`).join('\n') ?? '' %>
platforms:
<%= game.platforms?.filter(p => typeof p === 'object' && p.name).map(p => `  - "${p.name}"`).join('\n') ?? '' %>
developers:
<%= game.involved_companies?.filter(c => c.developer && c.company?.name).map(c => `  - "${c.company.name}"`).join('\n') ?? '' %>
publishers:
<%= game.involved_companies?.filter(c => c.publisher && c.company?.name).map(c => `  - "${c.company.name}"`).join('\n') ?? '' %>
game_modes:
<%= game.game_modes?.filter(m => typeof m === 'object' && m.name).map(m => `  - "${m.name}"`).join('\n') ?? '' %>
themes:
<%= game.themes?.filter(t => typeof t === 'object' && t.name).map(t => `  - "${t.name}"`).join('\n') ?? '' %>
purchased: false
purchased_at:
purchased_on:
purchased_price:
completed_at:
---
![cover|300]({{cover_url}})

## Summary
{{summary}}

## Notes
```

### Template Variables

Simple string variables can be used with `{{variable_name}}` syntax directly in your template.

| Variable             | Type   | Description                                              |
| -------------------- | ------ | -------------------------------------------------------- |
| `id`                 | number | IGDB game ID                                             |
| `slug`               | string | IGDB game slug                                           |
| `name`               | string | Game title                                               |
| `release_date`       | string | Release date as `YYYY-MM-DD`                             |
| `release_year`       | string | Release year as `YYYY`                                   |
| `cover_url`          | string | Cover image URL (`https://`, `t_cover_big` size)         |
| `summary`            | string | Short description of the game                            |
| `storyline`          | string | Longer narrative description                             |
| `rating`             | string | IGDB community rating (0–100, 1 decimal place)           |
| `aggregated_rating`  | string | External critics aggregate rating (0–100, 1 decimal)     |
| `genres`             | string | Comma-separated genre names (e.g. `Shooter, Action`)     |
| `platforms`          | string | Comma-separated platform names                           |
| `themes`             | string | Comma-separated theme names                              |
| `game_modes`         | string | Comma-separated game mode names                          |
| `developers`         | string | Comma-separated developer company names                  |
| `publishers`         | string | Comma-separated publisher company names                  |
| `url`                | string | IGDB game page URL                                       |
| `website`            | string | Official game website URL (if available)                 |
| `steam_url`          | string | Steam store page URL (if available)                      |

### Inline Scripts

For richer output (e.g. YAML lists), use the `<%= script %>` syntax to run JavaScript against the raw `game` object (`IGDBGame`).

**Genres as a list:**
```
genres:
<%= game.genres?.filter(g => typeof g === 'object' && g.name).map(g => `  - "${g.name}"`).join('\n') ?? '' %>
```

**Platforms as a list:**
```
platforms:
<%= game.platforms?.filter(p => typeof p === 'object' && p.name).map(p => `  - "${p.name}"`).join('\n') ?? '' %>
```

**Developers / Publishers (from `involved_companies`):**
```
developers:
<%= game.involved_companies?.filter(c => c.developer && c.company?.name).map(c => `  - "${c.company.name}"`).join('\n') ?? '' %>

publishers:
<%= game.involved_companies?.filter(c => c.publisher && c.company?.name).map(c => `  - "${c.company.name}"`).join('\n') ?? '' %>
```

> **Tip**: always use optional chaining (`?.`) and a `?? ''` fallback — IGDB may omit fields for less-documented games.

### Regenerating File Metadata

The plugin provides a **Regen** button in the settings panel (under *Advanced/Dangerous*) to regenerate metadata for all notes in your configured folder.

- Only the frontmatter (metadata block between `---`) is replaced; the body of the note is preserved
- The plugin looks for `id`, `slug`, or `name` frontmatter fields to re-query IGDB. As a last resort it uses the filename
- `steamId`, `steamPlaytimeForever`, `steamPlaytime2Weeks`, and any Steam metadata defined in settings are preserved through regeneration

## Settings Reference

| Setting | Description |
| --- | --- |
| IGDB Client ID | Twitch Developer app Client ID |
| IGDB Client Secret | Twitch Developer app Client Secret |
| New file location | Folder where game notes are created |
| New file name | Filename format — supports `{{name}}`, `{{release_year}}`, `{{DATE}}`, etc. |
| Template file | Path to your note template file in the vault |
| Steam API Key | Steam Web API key for library/wishlist sync |
| Steam ID | Your Steam user ID |
| Metadata for owned Steam games | Key/value pairs injected into owned game notes |
| Metadata for wishlisted Steam games | Key/value pairs injected into wishlisted game notes |
| Sync on start | Automatically sync Steam library when plugin loads |
| Sync playtime on start | Update playtime fields for all Steam-linked notes on load |
| Try match Steam game on creation | When creating a note, attempt to match it to a game in your Steam library |

