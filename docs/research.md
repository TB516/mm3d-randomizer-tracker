# Research notes

Development notes from the investigation that led to this project. Everything here was confirmed
against a live game unless marked otherwise.

## Target versions

- MM3D Randomizer **v1.5.1** (generator repo `Z3DR/MM3D_Randomizer`, tag `v1.5.1`).
- In-game randomizer code: `Z3DR/mm3dr` at commit `56dd88d97355cf468fe2b0ae30fb26babda291de` (the
  commit v1.5.1 pins).
- Azahar 2126.2 (Flatpak `org.azahar_emu.Azahar`). RPC protocol version 2.

## Test setup

- Azahar data lives on `<azahar-data>` (moved from the Flatpak default).
- Seed patch: `<azahar-data>/sdmc/luma/titles/0004000000125500/code.ips`.
- Save files under `<azahar-data>/sdmc/Nintendo 3DS/<zeros>/<zeros>/`:
  - game save: `title/00040000/00125500/data/00000001/save0.bin`
  - randomizer data: `extdata/00000000/00125500/user/0.bin` (4296 bytes)
- Settings: Linkus-ish preset. Shopsanity is off (shop items, bomb bags, bean seller and the swamp
  scrub's shop are vanilla, not checks).

## Data source: Azahar RPC

Decision: read live memory over Azahar's RPC server. It reflects the current cycle exactly, with no
need to save, and needs no game mod. Alternatives considered and rejected: save-file watching (only
updates on save), a companion randomizer mod that writes a log (custom build per seed and version),
and reading Azahar's process memory directly from Linux.

- Enable in Azahar settings (`enable_rpc_server` in `qt-config.ini`; menu location not confirmed). Off in
  the test machine's config by default.
- UDP on port **45987**, bound to **all interfaces** (`0.0.0.0`). While on, anything on the LAN can
  read and write emulated memory, send input, and save or load states. Azahar has no read-only mode.
  The app must only ever send read requests, and the README tells users to turn RPC off after playing.
- Packets: header `u32 version (2), u32 id, u32 type, u32 payload_size`, little-endian, then payload.
  Reply echoes the header. Max payload 32 KiB per request.
  - `ProcessList` (3): payload `u32 start, u32 max`. Reply `u32 count` then 0x14-byte entries
    `u32 pid, u64 title_id, char[8] name`.
  - `SetGetProcess` (4): payload `u32 op (1 = set), u32 pid`. Selects which emulated 3DS process
    reads target. Without it, reads hit whatever process is scheduled.
  - `ReadMemory` (1): payload `u32 address, u32 size`. Reply is raw bytes.
- MM3D title ID `0x0004000000125500`, process name `Joker`.
- Source: `azahar-emu/azahar` `src/core/rpc/`, reference client `dist/scripting/AzaharRPC.py`.

## Memory map (v1.5.1)

- Game save data (`SaveData`, 0x1A88 bytes) at **`0x7751E0`** (`CommonData` at `0x7751D8`, `save` at
  +8). Same layout as `save0.bin` from file offset 8.
  - `PlayerData` at +0x118: max health u16 at +0x1A (16 per heart), rupees u16 at +0x20.
  - Sword/shield u16 at +0x172. `InventoryData` at +0x174: items[24], masks[24], ...; count register
    at +0x78, collect register (remains, songs, heart pieces) at +0x7C.
  - Skulltula register at +0x1208: ocean count = low 16 bits, swamp count = high 16 bits.
  - Layouts: `mm3dr/code/include/game/common_data.h`, item IDs in `game/items.h`.
- Randomizer data (`ExtSaveData`, 4296 bytes) is a global placed by the linker in the randomizer's
  section (`.text` through `.bss`, starting at `0x7D0000`). Found at **`0x8C3940`** in the test game,
  but found by search, not hardcoded: scan `0x7D0000..0xA00000` for a 4-byte-aligned block with
  version `19`, `isNewFile` in {0,1}, and the collected and chest arrays containing only 0/1.
- `ExtSaveData` offsets (from `mm3dr/code/include/rnd/savefile.h`, check alignment carefully; an
  earlier hand count was off by 4):

  | Field                 | Offset | Type                                            |
  | --------------------- | ------ | ----------------------------------------------- |
  | version               | 0      | u32 (19)                                        |
  | playtimeSeconds       | 4      | u32                                             |
  | isNewFile             | 8      | u32                                             |
  | givenItemChecks       | 16     | u64 bitfield                                    |
  | givenSongChecks       | 24     | u16 bitfield                                    |
  | fairyRewards          | 26     | u8                                              |
  | tingleMaps            | 27     | u8                                              |
  | scenesDiscovered      | 28     | u32[4]                                          |
  | itemCollected         | 44     | u8[512], indexed like the seed's location table |
  | chestRewarded         | 556    | u8[116][32], by scene ID and chest flag         |
  | collectedTradeItems   | 4268   | u8[9]                                           |
  | dungeonFairyBitfields | 4280   | u32[4]                                          |

  The plan is to generate these offsets from the real headers (compile a small file against them for
  the 3DS ABI) instead of counting by hand.

## Seed data in `code.ips`

- Apply IPS records in file order (records overlap; sorting them corrupts strings).
- `SpoilerData`: find the string table `S` by searching for `Song of Time\0Deku Mask\0`. Base is
  `S - 1024 - 512*12 - 204`. Header: u8 sphere count, u16 location count at +2 (301 for this seed),
  50 sphere entries of 4 bytes, then `SpoilerItemLocation[512]` at base+204.
- `SpoilerItemLocation` (12 bytes): u16 location string offset, u16 item string offset, then u8
  CollectionCheckType, scene, flag, group, CollectType, RevealType, OverrideType, Collected.
- After the locations: `u16 SphereItemLocations[512]`, then `char StringData[16384]`.
- The spheres are the generator's playthrough order and are the planned logic test.
- The table also names the item at each check. The tracker must not show items (spoilers).

## How "collected" works

- `SpoilerLog_UpdateIngameLog` (`mm3dr/code/source/rnd/spoiler_data.cpp`) runs when an item is
  received. It marks the first location whose (OverrideType, scene, flag) matches the override key.
- Some checks share one item and get marked together: Tingle maps sold in two places, the three
  postboxes, Kotake in the potion shop and the woods, and the Goron Village winter/spring scrub and
  heart piece. Count them as one check. (Confirmed live: buying the Great Bay map marked both the
  Milk Road and Great Bay Coast entries at once.)
- `chestRewarded` keeps chest and Spider House token state across cycles. The Swamp Spider House uses
  `skulltulaMapSSH` order and the Ocean house uses index+1 (see `mm3dr/code/source/rnd/actors/en_si.cpp`).
- Cross-check that confirmed the decoding: items from the collected checks add up exactly to the
  save's token counts (14 swamp, 13 ocean) and hearts (10 plus 1 piece).

## Logic plan

- Rules live in `MM3D_Randomizer/source/location_access.cpp` (~4,500 lines at v1.5.1): areas with
  `EventAccess`, `LocationAccess` and `Entrance` entries, each a short boolean lambda.
- Helpers live in `source/logic.cpp` (~900 lines), `UpdateHelpers()` assigns derived variables in an
  order that matters and is re-run until stable.
- Decision: write a converter that turns those files into TypeScript (checked in, rerun per randomizer
  version), not a hand port and not compiling the C++ to WebAssembly (the files depend on the 3DS
  library and much of the generator's global state).
- Settings come from the seed (`gSettingsContext` in the patch; layout in the generator and mm3dr
  `settings.h`).
- Test: replay the seed's spheres. Every location in sphere N must be reachable with only items from
  earlier spheres.

## Prototype

`docs/prototype/live_test.py` is the working read-only RPC test (Python, standard library only):
selects the MM3D process, reads the save data, finds `ExtSaveData` by search, and prints each check
the moment it's collected. Run with `python3 -I docs/prototype/live_test.py <path to code.ips>`.

## Tracker this replaces

`tacoman369.github.io` (MM3D tracker). Its logic is hand-maintained and drifted from the randomizer
(for example, it requires a ranged attack for the Swamp Spider House). Its area and check names are
in `scripts/checks.js` if a familiar naming scheme helps.
