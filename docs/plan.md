# Build plan

The backend gets built and checked against the live game first. Logic comes after that, and UI
design comes last. Each step ends with a check against Azahar or the seed before the next starts.

## 1. RPC client

Port the prototype's request, chunked read, and process selection to an Effect service in
`src/main/`.

- Builds only ProcessList, SetGetProcess, and ReadMemory requests, so it cannot write memory.
- Matches replies by request ID, with a timeout and retries. Splits reads into 32 KiB chunks.
- Typed errors for no reply (Azahar closed or RPC off; UDP cannot tell them apart) and MM3D not
  running.
- The socket is a scoped resource that closes when the app quits.

Check: select the process and print the rupee count while changing it in game.

## 2. Seed loading (locations only)

Apply `code.ips` and read the spoiler table's locations: name, check type, scene, and flag.

- Item names are never returned, so they cannot reach the page.
- Typed errors for a file that is not an IPS patch and for a missing spoiler table.
- The loader takes the patch path as an argument. Only the manual-test wiring supplies a path,
  from a temporary environment variable, until the UI adds a picker.

Check: 301 locations for the test seed, named as the prototype printed them.

## 3. Memory decoding

- Save data: inventory, masks, songs, remains, sword and shield, hearts, Skulltula tokens.
- Randomizer data: find the block by scan, read collected checks, and scan again when it goes away
  (reset or another file loaded).
- Leave out the locations the game itself treats as duplicates of a shared item
  (`SpoilerData_IsUniqueLocation` in mm3dr), so each shared item counts once.

The `ExtSaveData` offsets stay hand-counted. They match the live game and the test save, so
generating them with the 3DS toolchain isn't worth it.

Check: collected checks add up to the save's token counts and hearts.

## 4. Poll loop and IPC

- Select the process, find the randomizer block, then read about twice a second.
- Game status: waiting for Azahar, waiting for MM3D, waiting for a loaded file, tracking, or
  failed. Seed status is separate: none, loading, error, or loaded.
- The page chooses the seed with a file picker and can restart tracking. The seed path is
  remembered between launches.
- Push state to the page through the preload's `watchTracker` only when it changes. The state type
  lives in `src/shared/` and has no Effect code.
- A throwaway debug page shows the status, collected checks, and raw inventory.

Check: play for a few minutes, including closing and reopening Azahar.

## 5. Logic

Logic runs in the main process and only sends each check's status to the page.

- **Found items** come from collected checks, as the generator counts them: the item at each
  collected check (looked up in the seed's table, never sent to the page), the item at each
  location the table leaves out once it's in logic, and the starting items from the seed's
  settings. A left-out location's item comes from the seed's item overrides, or is its vanilla item
  when the override can't say (a key several locations share, like a temple's stray fairies, or an
  item ID several items share). The live inventory isn't used, because it drops used keys,
  handed-over trade items, and which bottle is which.
- **Converter:** `scripts/convert-logic.mts`, run with `node scripts/convert-logic.mts <generator
  checkout>` (with its `Z3DR` submodule checked out). Written in Effect, it parses the C++ with
  tree-sitter and writes checked-in, formatted TypeScript marked as generated:
  - rules: each area's events, locations (by their seed table names), and exits, each a one-line
    function of `has`;
  - items: each item's name, logic variable, and get-item ID, and each location's vanilla item and
    override key.
- **Helpers:** the ~100 lines of `logic.cpp` (`Fighting`, `CanUse`, counts) are ported by hand next
  to the generated files.
- **Settings** read from `gSettingsContext`: starting items, the Bombers' minigame skip, and the
  remains the Moon and Majora need. For a seed with anything but glitchless logic, or with dungeon
  entrance shuffle on, every check shows as in logic for now. A message saying so is still to do.
- **Engine:** plain functions. Found items, settings, and rules in, the checks in logic out.
  Events and exits repeat until nothing new opens.
- **Shared items:** the skip list in `seed/spoiler-data.ts` becomes a copy of mm3dr's `multiLocs`
  (checked against the pinned commit). Each zone shows one row per shared item, in logic when any of
  its copies there is, so copies in other zones get their own rows and tick off together. The
  overall total counts each shared item once, as the game does.
- **Test:** Vitest (`pnpm test`). Sphere replay through the real path from collected checks onward:
  every location in sphere N must be in logic with only earlier spheres collected. The spheres come
  from the spoiler log the generator writes, since the patch only has them with in-game spoilers on.
  Runs every seed in `fixtures/seeds/`, which holds finished runs only. Passes for the test seed.
- **Page:** checks out of logic show as blocked, which the sidebar and map pins already style.
  Each blocked check shows what it needs: the items that each unlock it, or one set of items that
  does it together. Only items the seed has and the player hasn't found count, so it never
  points at where anything is.
- Check: play with the real game and see checks come into logic as items are found.

## 6. UI

Design the real page and replace the debug page: area list, check states, item grid, seed file
picker, and status messages.

Done: a map view (a pin per zone on the official map of Termina), the icon inventory, the seed
picker, status banners, and a route (bookmarked checks in order, saved per seed). Still to do, in
order:

- Bottles don't show in the inventory even when the save has them. Find out why.
- Title deeds traded away for their quests show as never found. Decide whether to keep showing
  them as found.
- A reminder of items the Song of Time takes away (like the seahorse and gold dust), and which
  check to go back to for each. The full list comes from the randomizer's code.
- When the run is in go mode, meaning everything needed to finish it is in logic, say so.
- A narrow-window layout (a single column of regions that expand), and an items-only window for
  OBS. A three-column list view was tried and dropped: it repeated the map view's sidebar.
- Remember the window's size and position between launches, in `settings.json` next to the seed
  path. For now a new window opens maximized.
- Maybe last: show where the player is (needs the current scene from memory), and have the selected
  zone follow it until another zone is picked.
