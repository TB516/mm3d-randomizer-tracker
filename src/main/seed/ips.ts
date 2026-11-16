import { Effect, Schema } from 'effect';

import { getUint24, matchesAt } from './bytes';

/** The file isn't a well-formed IPS patch. `message` says what's wrong, for the page. */
export class InvalidIpsPatch extends Schema.TaggedError<InvalidIpsPatch>()('InvalidIpsPatch', {
  message: Schema.String
}) {}

// IPS layout: `PATCH`, then records, then `EOF`. Every record has a header (offset, then size), then
// a body. Numbers are big-endian.
const header = new TextEncoder().encode('PATCH');
const footer = new TextEncoder().encode('EOF');

/** Record header: where to write the record's bytes. */
const offsetSize = 3;
/** Record header: how many bytes the body holds. 0 marks a run record instead. */
const sizeFieldSize = 2;
const recordHeaderSize = offsetSize + sizeFieldSize;

/** Run record body: how many times to repeat the byte. */
const runLengthSize = 2;
/** Run record body: the byte to repeat. */
const runByteSize = 1;
const runBodySize = runLengthSize + runByteSize;

/** One "write these bytes at this offset" entry in the patch. */
type IpsRecord = { offset: number; bytes: Uint8Array };

/**
 * Reads every record in an IPS patch, in file order.
 *
 * @param patch - The whole patch file.
 * @returns The records, with run records already expanded to their bytes.
 */
const readRecords = Effect.fnUntraced(function* (patch: Uint8Array) {
  if (!matchesAt(patch, header, 0)) {
    return yield* new InvalidIpsPatch({ message: 'The file is not an IPS patch.' });
  }

  // DataView reads big-endian by default, which is what IPS uses.
  const view = new DataView(patch.buffer, patch.byteOffset, patch.byteLength);
  const records: IpsRecord[] = [];
  let position = header.length;

  while (!matchesAt(patch, footer, position)) {
    // Each check comes before the read it protects, so no read can run past the end.
    if (position + recordHeaderSize > patch.length) {
      return yield* new InvalidIpsPatch({ message: 'The patch ends without an EOF marker.' });
    }

    const offset = getUint24(view, position);
    const size = view.getUint16(position + offsetSize);
    position += recordHeaderSize;

    const bodySize = size === 0 ? runBodySize : size;
    if (position + bodySize > patch.length) {
      return yield* new InvalidIpsPatch({ message: 'The patch ends partway through a record.' });
    }

    if (size === 0) {
      const runLength = view.getUint16(position);
      const runByte = view.getUint8(position + runLengthSize);
      records.push({ offset, bytes: new Uint8Array(runLength).fill(runByte) });
    } else {
      // A view into the patch, not a copy.
      records.push({ offset, bytes: patch.subarray(position, position + size) });
    }

    position += bodySize;
  }

  return records;
});

/**
 * Applies an IPS patch to an empty image.
 *
 * @param patch - The whole patch file.
 * @returns An image just big enough for every record, with unpatched bytes left as zero.
 */
export const applyIpsPatch = Effect.fn('applyIpsPatch')(function* (patch: Uint8Array) {
  const records = yield* readRecords(patch);

  // The image has to reach the end of whichever record ends furthest in.
  const imageSize = records.reduce(
    (furthestEnd, record) => Math.max(furthestEnd, record.offset + record.bytes.length),
    0
  );
  const image = new Uint8Array(imageSize);

  // Later records overwrite earlier ones where they overlap, so this has to stay in file order.
  for (const record of records) {
    image.set(record.bytes, record.offset);
  }

  return image;
});
