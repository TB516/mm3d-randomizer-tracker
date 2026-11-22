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
- Seed patch: Azahar loads the installed seed from
  `~/.var/app/org.azahar_emu.Azahar/data/azahar-emu/load/mods/0004000000125500/code.ips`, backed up in
  `<azahar-data>/mod-sets/randomizer-current/`. The generator writes new seeds to
  `<azahar-data>/sdmc/luma/titles/0004000000125500/`, which Azahar doesn't read.
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
    at +0x78, collect register (remains, songs, the Goron Lullaby intro, heart pieces) at +0x7C.
  - Temple items, one byte per temple in the order Woodfall, Snowhead, Great Bay, Stone Tower, at
    `InventoryData` +0x80 (bits: boss key 0, compass 1, map 2), small keys at +0x8A, and stray
    fairies at +0x94. The game starts keys at `0xFF`, which the randomizer sets to 0 on a new file.
    The randomizer skips the Song of Time loop that clears these (`patch_DoNotRemoveKeys`), so they
    carry across cycles. Keys and dungeon items confirmed live on a new file with them set to "Start
    With"; the fairy counts aren't confirmed live yet.
  - Skulltula register at +0x1208: ocean count = low 16 bits, swamp count = high 16 bits.
  - Layouts: `mm3dr/code/include/game/common_data.h`, item IDs in `game/items.h`.
- Randomizer data (`ExtSaveData`, 4296 bytes) is a global placed by the linker in the randomizer's
  section (`.text` through `.bss`, starting at `0x7D0000`). Found at **`0x8C3940`** in the test game,
  but found by search, not hardcoded: scan `0x7D0000..0xA00000` for a 4-byte-aligned block with
  version `19`, `isNewFile` in {0,1}, the collected and chest arrays containing only 0/1, and each
  trade item slot either `0xFF` or its own item's ID. A new file has no checks collected, so the
  scan can't require any.
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

  `collectedTradeItems` has a fixed slot per trade item: Moon's Tear, the four title deeds, Room
  Key, Letter to Kafei, Pendant of Memories, Letter to Mama. A slot holds that item's ID while the
  player has it and `0xFF` once it's traded away (`SaveFile_InitExtSaveData` in mm3dr's
  `savefile.cpp`). The item screen shows only one trade item per slot, so the tracker reads these.

  These hand-counted offsets are the ones the tracker uses. They're confirmed against the live game
  and the saved `0.bin`, so they aren't generated from the headers.

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
  postboxes, Kotake in the potion shop and the woods, Keaton in three places, and the winter/spring
  or poisoned/cleared versions of some Goron Village and swamp checks. `SpoilerLog_CheckMultiLocationItems`
  marks the others by a hardcoded list (same type and flag, different scenes), and
  `SpoilerData_IsUniqueLocation` lists which copies the game skips when counting. The tracker copies
  the groups from `SpoilerLog_CheckMultiLocationItems` instead: copies in the same zone are one
  check, copies in different zones are separate checks, and the overall total counts each shared
  item once. The test seed has 301 locations and 283 after removing duplicates. (Confirmed live:
  buying the Great Bay map marked both the Milk Road and Great Bay Coast entries at once.)
- `chestRewarded` keeps chest and Spider House token state across cycles. The Swamp Spider House uses
  `skulltulaMapSSH` order and the Ocean house uses index+1 (see `mm3dr/code/source/rnd/actors/en_si.cpp`).
- Cross-check that confirmed the decoding: items from the collected checks add up exactly to the
  save's token counts (14 swamp, 13 ocean) and hearts (10 plus 1 piece).

## Logic plan

- Rules live in `MM3D_Randomizer/source/location_access.cpp` (~4,500 lines at v1.5.1): areas with
  `EventAccess`, `LocationAccess` and `Entrance` entries, each a short boolean lambda.
- Helpers live in `source/logic.cpp` (~900 lines), `UpdateHelpers()` assigns derived variables in an
  order that matters and is re-run until stable.
- Decision: write a converter that turns the area rules into TypeScript (checked in, rerun per
  randomizer version), not a hand port and not compiling the C++ to WebAssembly (the files depend on
  the 3DS library and much of the generator's global state). The helpers are short and use odd C++,
  so they're ported by hand.
- At v1.5.1: about 260 areas, 465 check rules, 190 event rules, and 590 exit rules, every one a
  single-line lambda. The only calls are `CanUse`, `CanPlay`, and a few count helpers. There's no time
  of day: every rule holds on any day. The only settings the rules read are `SkipBombersMinigame` and
  the remains required for the Moon and Majora.
- Each item in the generator's item list sets one logic variable (for example "Bottle with Red
  Potion" sets `WitchBottle`). The seed's table uses the same English item and location names.
- The seed's table leaves out locations that aren't randomized (spoiler_log.cpp skips them by
  setting, and excluded ones). The generator still puts an item at each, and counts it once the
  location is reachable. Usually that's the vanilla item, but not always: excluded locations get
  junk, and the starting sword's spot gets a green rupee without a starting sword.
- `rItemOverrides` (at `0x7c833c` in a v1.5.1 seed's patched image, up to 640 8-byte entries, unused
  ones zero) lists the item at every placed location: key `pad, scene, type, flag`, then a u16
  get-item ID. The key type comes from the location kind (`ItemLocation::Key`); stray fairies,
  rewards, and hint stones keep type 0. Some locations share a key, like a temple's stray fairies,
  shop slots, cows, and Zora eggs, so the table holds one item for all of them. A few get-item IDs
  are shared by items that set different logic variables (magic bean and bean pack, some bottles,
  Zora eggs, and ID 0 for stray fairies and magic). For those, logic falls back to the vanilla item.
- Settings come from `gSettingsContext`, at `0x7c387c` in a v1.5.1 seed's patched image (192 bytes;
  layout in mm3dr `rnd/settings.h`, with u32s and one u16 aligned). Confirmed on the test seed:
  glitchless logic at +7, no entrance shuffle at +10, remains needed for the Moon and Majora at +185
  and +186. The generator writes the overrides, the settings, then `SpoilerData` as consecutive IPS
  records.
- The patch's spheres are only filled with in-game spoilers on. The spoiler log the generator writes
  (`sdmc/MM3DR/Spoiler_Logs/<seed> (<hash>)-spoilerlog.xml`) always has the playthrough, as
  `<sphere>` elements of `<location name>`.
- Quirks of the v1.5.1 logic, kept as-is:
  - The generator only recalculates helpers when it applies an item, and events are checked
    without it. `Bugs` and `Fish` are helpers that events also set, so they end up true when either
    their formula holds or their event happened.
  - No item sets `BuyBombchus5/10/20`, so `HasBombchus` is never true. The Moon's Link Trial heart
    piece room is out of logic, and with it the trial's bonus and Majora's Child.
  - `CanUse` is false for a few masks the generator leaves out of its usable-items list, like Kamaro's
    Mask.
- Test: replay the spoiler log's spheres. Every location in sphere N must be reachable with only
  items from earlier spheres. Passes for the test seed (13 spheres).

## Prototype

`docs/prototype/live_test.py` is the working read-only RPC test (Python, standard library only):
selects the MM3D process, reads the save data, finds `ExtSaveData` by search, and prints each check
the moment it's collected. Run with `python3 -I docs/prototype/live_test.py <path to code.ips>`.

## Tracker this replaces

`tacoman369.github.io` (MM3D tracker). Its logic is hand-maintained and drifted from the randomizer
(for example, it requires a ranged attack for the Swamp Spider House). Its area and check names are
in `scripts/checks.js` if a familiar naming scheme helps.
