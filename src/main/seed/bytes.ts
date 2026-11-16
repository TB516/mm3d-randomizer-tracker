/**
 * Checks whether `bytes` holds `marker` starting at `position`.
 *
 * @param bytes - The bytes to look in.
 * @param marker - The exact bytes to look for.
 * @param position - Where in `bytes` the marker should start.
 * @returns `false` if any byte differs, or if the marker would run past the end.
 */
export const matchesAt = (bytes: Uint8Array, marker: Uint8Array, position: number) =>
  position + marker.length <= bytes.length &&
  marker.every((byte, index) => bytes[position + index] === byte);

/**
 * Reads a big-endian 3-byte unsigned number, which `DataView` has no method for.
 *
 * @param view - The bytes to read from.
 * @param position - Where the number starts.
 * @returns The number.
 */
export const getUint24 = (view: DataView, position: number) => {
  // The first byte is the top 8 bits, and the next two are the low 16.
  const high = view.getUint8(position);
  const low = view.getUint16(position + 1);
  return high * 0x10000 + low;
};
