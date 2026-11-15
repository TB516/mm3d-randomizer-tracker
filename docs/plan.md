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
- Group checks that share one item by check type, scene, and flag, so each group counts once.

Open decision: generate the `ExtSaveData` offsets from the real headers now, or start from the
hand-counted offsets confirmed live.

Check: collected checks add up to the save's token counts and hearts.

## 4. Poll loop and IPC

- Select the process, find the randomizer block, then read about twice a second.
- Status: waiting for Azahar, waiting for MM3D, waiting for a loaded file, tracking.
- Push state to the page through the preload's `onState` only when it changes. The state type
  lives in `src/shared/` and has no Effect code.
- A throwaway debug page shows the status, collected checks, and raw inventory.

Check: play for a few minutes, including closing and reopening Azahar.

## 5. Logic

- Read the seed's settings from the patch.
- Converter that turns the generator's `location_access.cpp` and `logic.cpp` into checked-in
  TypeScript. Where it lives and how it runs gets decided at this step.
- Plain-function engine: items, settings, and rules in, reachable areas and checks out.
- Sphere-replay test (the test runner gets set up here): every location in sphere N must be
  reachable with only items from earlier spheres.
- The debug page shows each check as done, available, or locked.

## 6. UI

Design the real page and replace the debug page: area list, check states, item grid, seed file
picker, and status messages.
