// Packet format for Azahar's RPC server (`src/core/rpc/` in azahar). Every packet is a 16-byte
// little-endian header, `version, id, type, payload size`, then the payload. Replies echo the
// request's header with their own payload size.

export const rpcAddress = '127.0.0.1';
export const rpcPort = 45987;

/** 32 KiB, the largest payload Azahar sends or accepts, which caps each memory read. */
// 32 * 1024 (1024 is 1 KiB in bytes).
export const maxPayloadSize = 32 * 1024;

const protocolVersion = 2;

/**
 * Size of unsigned int32 in bytes.
 * Every number in a packet is a little-endian u32, except the 64-bit title IDs.
 */
const u32Size = 4;

/** Where each header field starts in bytes. The header is these four u32s. */
const headerFields = { version: 0, id: 4, type: 8, payloadSize: 12 } as const;
/** Size of header in bytes */
const headerSize = 16;

/** A ProcessList entry: process ID (u32), title ID (u64), then an 8-byte name that isn't read. */
const processEntryFields = { processId: 0, titleId: 4 } as const;
const processEntrySize = 0x14;

/**
 * The only request types the client can send. Azahar also accepts writes, input, and save states,
 * so leaving them out here keeps the tracker read-only.
 */
export const RequestType = {
  ReadMemory: 1,
  ProcessList: 3,
  SetGetProcess: 4
} as const;

export type RequestType = (typeof RequestType)[keyof typeof RequestType];

/** A process running in the emulated 3DS. */
export type EmulatedProcess = {
  /** The emulated kernel's ID for the process, which `SetGetProcess` takes. */
  readonly processId: number;
  /** The program's 64-bit title ID, such as `0x0004000000125500` for MM3D. */
  readonly titleId: bigint;
};

/**
 * Builds a request packet.
 *
 * @param id - Echoed back in the reply, so the reply can be matched to this request.
 * @param type - Which request to send.
 * @param args - The request's two u32 arguments. Every request this client sends takes two.
 * @returns The header followed by the arguments, ready to send.
 */
export const encodeRequest = (
  id: number,
  type: RequestType,
  args: readonly [number, number]
): Uint8Array => {
  const payloadSize = args.length * u32Size;
  const packet = new Uint8Array(headerSize + payloadSize);
  const view = new DataView(packet.buffer);

  // `true` makes each write little-endian, the 3DS's byte order.
  view.setUint32(headerFields.version, protocolVersion, true);
  view.setUint32(headerFields.id, id, true);
  view.setUint32(headerFields.type, type, true);
  view.setUint32(headerFields.payloadSize, payloadSize, true);

  // The payload is the arguments, one after another, right after the header.
  args.forEach((arg, index) => view.setUint32(headerSize + index * u32Size, arg, true));

  return packet;
};

/**
 * Splits a reply into the header fields the client needs and its payload.
 *
 * @param packet - A whole datagram received from Azahar.
 * @returns The reply's request ID, request type, and payload, or `undefined` if the packet is too
 * short or its payload size doesn't match its length.
 */
export const decodeReply = (packet: Uint8Array) => {
  if (packet.length < headerSize) return undefined;

  // `packet` can be a window into a bigger buffer, so the view has to start where it does.
  const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);

  // The header's payload size has to match what actually arrived, or the packet is garbage.
  const payloadSize = view.getUint32(headerFields.payloadSize, true);
  if (payloadSize !== packet.length - headerSize) return undefined;

  return {
    id: view.getUint32(headerFields.id, true),
    type: view.getUint32(headerFields.type, true),
    payload: packet.subarray(headerSize)
  };
};

/**
 * Reads the processes from a ProcessList reply.
 *
 * @param payload - The reply's payload, without its header.
 * @returns Each process listed, stopping early if the payload is shorter than its count says.
 */
export const decodeProcessList = (payload: Uint8Array): ReadonlyArray<EmulatedProcess> => {
  // Too short to even hold the count.
  if (payload.length < u32Size) return [];

  // The payload is a u32 count, then one entry per process.
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  // Trust the count only as far as the entries that actually fit after it.
  const entriesThatFit = Math.floor((payload.length - u32Size) / processEntrySize);
  const count = Math.min(view.getUint32(0, true), entriesThatFit);

  return Array.from({ length: count }, (_, index) => {
    const entry = u32Size + index * processEntrySize;
    return {
      processId: view.getUint32(entry + processEntryFields.processId, true),
      titleId: view.getBigUint64(entry + processEntryFields.titleId, true)
    };
  });
};
