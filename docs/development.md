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
  - `seed/` applies the seed's `code.ips` and reads its checks. Item names are never read, so they can't reach the page. `current-seed.ts` is the service that holds the seed the tracker follows. It loads the seed remembered from the last launch, and can switch to another while the app runs.
  - `game/` decodes the game's save data (inventory), finds and reads the randomizer's data (collected checks), and finds the game among Azahar's processes. `connection.ts` is the service that reaches the game and reads it twice a second. Each attempt opens its own RPC socket. A failure sets a waiting status and starts a new attempt after two seconds. An unexpected error is logged and stops tracking with a `failed` status until it's restarted. It knows nothing about seeds.
  - `settings.ts` remembers the seed path between launches, in `settings.json` in Electron's `userData` folder (`~/.config/mm3d-tracker` on Linux, or under `$XDG_CONFIG_HOME`).
  - `tracker.ts` combines the seed and the game into the state the page shows. Logic will plug in here.
  - `ipc.ts` streams that state to the page and handles the page's commands.
- `src/preload/` exposes `window.api` to the renderer. `watchTracker` streams the tracker's state over its own `MessageChannel`, which closes when the page reloads or closes. `chooseSeed` and `restartTracking` are commands that return nothing: what they change arrives through the state.
- `src/renderer/` is the Svelte UI, currently a debug page that shows the raw state. It and `src/shared/` stay free of Effect.
- `src/shared/` holds the tracker state type, item names, and IPC channel names.

Each directory under `src/main/` is one area, and its service lives inside it. A service's operations are defined inside its layer. Effects that only use another service and keep no state are standalone functions, in their own file when that keeps the service file short. Files read in the same order: errors, constants, types, helpers, then the service or exported functions.

`plan.md` is the build order. `research.md` holds the findings behind the design: the Azahar RPC protocol, memory addresses, and the seed's data layout.

The [Effect language service](https://github.com/Effect-TS/language-service) is a TypeScript plugin set in `tsconfig.node.json`, so editors using the workspace TypeScript show its diagnostics. `pnpm typecheck` also runs them.

TypeScript stays on 6.x until `svelte-check` supports TypeScript 7.
