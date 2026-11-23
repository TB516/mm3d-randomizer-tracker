# Development

Tools are managed with [mise](https://mise.jdx.dev). Run `mise install`, then `pnpm install`.

| Command        | What it does                                               |
| -------------- | ---------------------------------------------------------- |
| `pnpm dev`     | Run the app with hot reload                                |
| `pnpm check`   | Lint (oxlint), check formatting (oxfmt), and type check    |
| `pnpm format`  | Format everything with oxfmt                               |
| `pnpm test`    | Run the tests with Vitest (see Logic below)                |
| `pnpm build:*` | Package for `win`, `mac`, or `linux` with electron-builder |

## Layout

- `src/main/` is the Electron main process: app lifecycle, windows, IPC, and the tracker. Backend code uses Effect where it adds something.
  - `azahar/` talks to Azahar's RPC server. `protocol.ts` encodes and decodes the packets, and can only build process-list, select-process, and read-memory requests. `rpc.ts` is the read-only client service over Effect's UDP socket.
  - `seed/` applies the seed's `code.ips` and reads its checks, settings (`seed-settings.ts`), and item overrides (`item-overrides.ts`). A check's item only reaches the page once the check is collected. Copies of a shared item in the same zone become one check, and copies in different zones stay separate checks that the overall total counts once. Each check is sorted into a zone by the start of its name (`place-in-zone.ts`, using the table in `src/shared/zones.ts`), and the page shows names without that prefix. Every location the v1.5.1 generator can put in a seed matches a zone. A check that matches none, such as one from a newer randomizer version, goes in an "Other" zone with its own pin in the map's top-right corner. `current-seed.ts` is the service that holds the seed the tracker follows. It loads the seed remembered from the last launch, and can switch to another while the app runs.
  - `game/` decodes the game's save data (inventory), finds and reads the randomizer's data (collected checks), and finds the game among Azahar's processes. `connection.ts` is the service that reaches the game and reads it twice a second. Each attempt opens its own RPC socket. A failure sets a waiting status and starts a new attempt after two seconds. An unexpected error is logged and stops tracking with a `failed` status until it's restarted. It knows nothing about seeds.
  - `settings.ts` remembers the seed path between launches, in `settings.json` in Electron's `userData` folder (`~/.config/mm3d-tracker` on Linux, or under `$XDG_CONFIG_HOME`).
  - `logic/` decides which checks are in logic. `generated/` is written by `scripts/convert-logic.mts` from the generator's source; don't edit it. `has.ts` hand-ports the generator's helpers, and `engine.ts` works out the item at each location and searches the areas the way the generator does. `check-needs.ts` works out what blocked checks need: the items still out there that each unlock a check alone (one search per item answers every check), or, when none does, one set that does it together (found by starting from every item and dropping them in halves while the rest still works). After the seed or the collected checks change, the tracker works out every zone in the background, one zone at a time so the game reads aren't held up, and keeps the answers until the next change. The page asks for the selected zone's checks, which works them out first if the background pass hasn't reached them yet.
  - `tracker.ts` combines the seed, the game, and logic into the state the page shows. `found-items.ts` adds what's been found (the items at collected checks, and the starting items) to what the save holds, so the inventory shows everything found even after it's traded away or used up, and records where each part was found. Refills, bottles, hearts, tokens, and stray fairies go by the save alone.
  - `ipc.ts` streams that state to the page, handles the page's commands, and answers what checks need.
- `src/preload/` exposes `window.api` to the renderer. `watchTracker` streams the tracker's state over its own `MessageChannel`, which closes when the page reloads or closes. `chooseSeed` and `restartTracking` are commands that return nothing: what they change arrives through the state. `findChecksNeeds` asks what blocked checks need, by their `id`s from the state.
- `src/renderer/` is the Svelte UI. It and `src/shared/` stay free of Effect.
  - The map view has a pin per zone on the map of Termina. Each pin's ring shows how much of the zone is left. The map keeps its shape at every window size: its column is sized from the window's height, and the zone column beside it takes the rest of the width. The map's left and right edges fade into the background. The check count, hearts, magic, wallet and tokens sit on a card in the map's corner, the inventory runs under the map, and the selected zone fills the column beside it: a close-up of its spot on the map, its checks (those left first), and the rest of its region.
  - `lib/checks.ts` decides how a check shows: done once collected, unknown (a hollow gray dot) until the game is read, otherwise available in logic and blocked out of it.
  - `lib/map-pins.ts` places each zone's pin, in the map image's pixels. The Moon has no place on the map, so its pin sits in the sky above the mountains.
  - `lib/inventory-tiles.ts` turns the inventory into the icon tiles. Hovering a tile names where it was found, and clicking one found at a check opens that check's zone with the check lit up (`lib/found-items.ts` shares where each part came from with the tiles through context).
  - Each blocked check shows what it needs on its row, after an em dash: item icons joined by "or" (any one unlocks it) or "and" (needed together). Each collected check shows the item it gave the same way, in the zone list and the route's Completed list. `lib/item-icons.ts` picks each item's icon, and items without one show their name.
  - With no zone selected, the column shows the route instead: checks bookmarked from the zones' lists, in order, grouped wherever the route moves to a new zone under that zone's name, which opens it. Clicking the map away from the pins, clicking a selected pin again, the zone's back button, or Escape returns to it. `lib/route.svelte.ts` keeps the route, saved per seed in the page's `localStorage` under the seed's path, since check IDs only mean something within one seed. Collected stops move to a Completed list until they're cleared. `lib/check-needs.svelte.ts` asks for blocked checks' needs for both the zone list and the route.
- `src/shared/` holds the tracker state type, the zone table, item names, and IPC channel names.
- `fixtures/seeds/` holds test seeds (see Logic below).

## Assets

- `src/renderer/src/assets/termina.png` is Nintendo's painted map of Termina from the official Japanese Majora's Mask 3D site (`nintendo.co.jp/3ds/ajrj/world/images/world_map.png`).
- `src/renderer/src/assets/items/` holds the game's menu icons, from Zelda Wiki's Majora's Mask 3D sprites. Icons MM3D doesn't have, like the potions, bomb bags, and quivers, come from the Ocarina of Time 3D sprites. The purple, silver, and huge rupees are the red rupee recolored with a CSS filter, double defense is the heart container in the hearts counter's white outline, and ice traps use the OoT3D Blue Fire. The spin attack icon is drawn for this project from the Kokiri Sword. The magic meter has no icon, so the counters draw one, twice as long for double magic like in the game. The Child's Wallet has no icon either, so until the first upgrade the counters show the Adult's Wallet greyed out. Each temple's stray fairy is the pink Woodfall icon recolored with a CSS filter.
- Both are Nintendo's artwork.

Each directory under `src/main/` is one area, and its service lives inside it. A service's operations are defined inside its layer. Effects that only use another service and keep no state are standalone functions, in their own file when that keeps the service file short. Files read in the same order: errors, constants, types, helpers, then the service or exported functions.

## Logic

The rules come from the MM3D Randomizer generator. When it updates, check out the new tag with its `Z3DR` submodule (`git submodule update --init`), then run `node scripts/convert-logic.mts <checkout>`. The script parses the C++ with [tree-sitter](https://tree-sitter.github.io) (its C++ grammar's WebAssembly build, so the grammar's native build stays off in `pnpm-workspace.yaml`), formats what it writes, and stops on anything it doesn't recognize. The helpers in `src/main/logic/has.ts` may need porting again.

The logic test replays each seed's playthrough from `fixtures/seeds/`. A seed's folder holds its `code.ips` and the spoiler log the generator wrote with it, renamed to `spoilerlog.xml`; the log also lists the seed's settings. Both hold the whole spoiler, so only add seeds from runs that are finished.

`plan.md` is the build order. `research.md` holds the findings behind the design: the Azahar RPC protocol, memory addresses, and the seed's data layout.

The [Effect language service](https://github.com/Effect-TS/language-service) is a TypeScript plugin set in `tsconfig.node.json`, so editors using the workspace TypeScript show its diagnostics. `pnpm typecheck` also runs them.

TypeScript stays on 6.x until `svelte-check` supports TypeScript 7.
