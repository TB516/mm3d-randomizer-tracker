/**
 * Where `rItemOverrides` sits in a v1.5.1 seed's patched image (the generator writes it at
 * `RITEMOVERRIDES_ADDR - 0x100000`). The game's array holds up to 640 entries, and the generator
 * only fills the first ones, so the rest stay zero.
 */
const overridesAddress = 0x7c833c;
const maxOverrides = 640;

/**
 * An `ItemOverride` from mm3dr's `rnd/item_override.h`: a key of padding, scene, override type,
 * and flag, then a value that starts with the u16 get-item ID.
 */
const overrideSize = 8;
const keyFields = { scene: 1, type: 2, flag: 3 } as const;
const getItemIdOffset = 4;

/**
 * Builds the key overrides are looked up by, in the form the generated location table uses.
 *
 * @param scene - The location's scene.
 * @param type - Its override type.
 * @param flag - Its flag.
 * @returns The key.
 */
const overrideKey = (scene: number, type: number, flag: number) => `${scene} ${type} ${flag}`;

/**
 * Reads the item the seed puts at every location, as get-item IDs. This covers locations the seed's
 * table leaves out, like non-randomized and excluded ones.
 *
 * @param image - The output of `applyIpsPatch` for the seed's `code.ips`.
 * @returns Each location's get-item ID by override key (`scene type flag`).
 */
export const readItemOverrides = (image: Uint8Array) => {
  const view = new DataView(image.buffer, image.byteOffset, image.byteLength);
  const overrides = new Map<string, number>();

  for (let index = 0; index < maxOverrides; index++) {
    const entry = overridesAddress + index * overrideSize;
    if (entry + overrideSize > image.length) break;

    const getItemId = view.getUint16(entry + getItemIdOffset, true);
    if (getItemId === 0 && view.getUint32(entry, true) === 0) break;

    const key = overrideKey(
      view.getUint8(entry + keyFields.scene),
      view.getUint8(entry + keyFields.type),
      view.getUint8(entry + keyFields.flag)
    );
    overrides.set(key, getItemId);
  }

  return overrides;
};
