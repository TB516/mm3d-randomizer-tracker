# Development

Tools are managed with [mise](https://mise.jdx.dev). Run `mise install`, then `pnpm install`.

| Command        | What it does                                               |
| -------------- | ---------------------------------------------------------- |
| `pnpm dev`     | Run the app with hot reload                                |
| `pnpm check`   | Lint (oxlint), check formatting (oxfmt), and type check    |
| `pnpm format`  | Format everything with oxfmt                               |
| `pnpm build:*` | Package for `win`, `mac`, or `linux` with electron-builder |

## Layout

- `src/main/` is the Electron main process: app lifecycle, windows, IPC, and the tracker. Backend code uses Effect where it adds something.
  - `azahar/` talks to Azahar's RPC server. `protocol.ts` encodes and decodes the packets, and can only build process-list, select-process, and read-memory requests. `rpc.ts` is the read-only client service over Effect's UDP socket.
  - `seed/` applies the seed's `code.ips` and reads its checks. Item names are never read, so they can't reach the page. Each check is sorted into a zone by the start of its name (`place-in-zone.ts`, using the table in `src/shared/zones.ts`), and the page shows names without that prefix. Every location the v1.5.1 generator can put in a seed matches a zone. A check that matches none, such as one from a newer randomizer version, goes in an "Other" zone with its own pin in the map's top-right corner. `current-seed.ts` is the service that holds the seed the tracker follows. It loads the seed remembered from the last launch, and can switch to another while the app runs.
  - `game/` decodes the game's save data (inventory), finds and reads the randomizer's data (collected checks), and finds the game among Azahar's processes. `connection.ts` is the service that reaches the game and reads it twice a second. Each attempt opens its own RPC socket. A failure sets a waiting status and starts a new attempt after two seconds. An unexpected error is logged and stops tracking with a `failed` status until it's restarted. It knows nothing about seeds.
  - `settings.ts` remembers the seed path between launches, in `settings.json` in Electron's `userData` folder (`~/.config/mm3d-tracker` on Linux, or under `$XDG_CONFIG_HOME`).
  - `tracker.ts` combines the seed and the game into the state the page shows. Logic will plug in here.
  - `ipc.ts` streams that state to the page and handles the page's commands.
- `src/preload/` exposes `window.api` to the renderer. `watchTracker` streams the tracker's state over its own `MessageChannel`, which closes when the page reloads or closes. `chooseSeed` and `restartTracking` are commands that return nothing: what they change arrives through the state.
- `src/renderer/` is the Svelte UI. It and `src/shared/` stay free of Effect.
  - The map view has a pin per zone on the map of Termina. Each pin's ring shows how much of the zone is left. The map keeps its shape at every window size: its column is sized from the window's height, and the zone column beside it takes the rest of the width. The map's left and right edges fade into the background. The check count, hearts, magic, wallet and tokens sit on a card in the map's corner, the inventory runs under the map, and the selected zone fills the column beside it: a close-up of its spot on the map, its checks (those left first), and the rest of its region.
  - `lib/checks.ts` decides how a check shows. Until logic exists, every check that isn't collected counts as available.
  - `lib/map-pins.ts` places each zone's pin, in the map image's pixels. The Moon has no place on the map, so its pin sits in the sky above the mountains.
  - `lib/inventory-tiles.ts` turns the inventory into the icon tiles.
- `src/shared/` holds the tracker state type, the zone table, item names, and IPC channel names.

## Assets

- `src/renderer/src/assets/termina.png` is Nintendo's painted map of Termina from the official Japanese Majora's Mask 3D site (`nintendo.co.jp/3ds/ajrj/world/images/world_map.png`).
- `src/renderer/src/assets/items/` holds the game's menu icons, from Zelda Wiki's Majora's Mask 3D sprites. Icons MM3D shares with Ocarina of Time 3D are stored there under their OoT3D names. The magic meter has no icon, so the counters draw one, twice as long for double magic like in the game. The Child's Wallet has no icon either, so until the first upgrade the counters show the Adult's Wallet greyed out. Each temple's stray fairy is the pink Woodfall icon recolored with a CSS filter.
- Both are Nintendo's artwork.

Each directory under `src/main/` is one area, and its service lives inside it. A service's operations are defined inside its layer. Effects that only use another service and keep no state are standalone functions, in their own file when that keeps the service file short. Files read in the same order: errors, constants, types, helpers, then the service or exported functions.

`plan.md` is the build order. `research.md` holds the findings behind the design: the Azahar RPC protocol, memory addresses, and the seed's data layout.

The [Effect language service](https://github.com/Effect-TS/language-service) is a TypeScript plugin set in `tsconfig.node.json`, so editors using the workspace TypeScript show its diagnostics. `pnpm typecheck` also runs them.

TypeScript stays on 6.x until `svelte-check` supports TypeScript 7.
