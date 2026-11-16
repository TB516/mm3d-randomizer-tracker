import { NodeDatagramSocket } from '@effect/platform-node';
import { Context, Deferred, Effect, Layer, Schema } from 'effect';
import { DatagramSocket } from 'effect/socket';

import {
  decodeProcessList,
  decodeReply,
  encodeRequest,
  type EmulatedProcess,
  maxPayloadSize,
  RequestType,
  rpcAddress,
  rpcPort
} from './protocol';

/** No reply in time. UDP can't tell "Azahar is closed" apart from "the RPC server is off". */
export class AzaharNotResponding extends Schema.TaggedError<AzaharNotResponding>()(
  'AzaharNotResponding',
  {}
) {}

/** Azahar replied with no data, which happens when the selected process no longer exists. */
export class MemoryReadFailed extends Schema.TaggedError<MemoryReadFailed>()('MemoryReadFailed', {
  /** Start of the chunk that came back empty. */
  address: Schema.Number
}) {}

/** How long each try waits for its reply. Local replies take well under a millisecond. */
const replyTimeout = '500 millis';

/** Read-only client for Azahar's RPC server. */
export class AzaharRpc extends Context.Service<
  AzaharRpc,
  {
    /** Lists every process running in the emulated 3DS. */
    readonly listProcesses: Effect.Effect<ReadonlyArray<EmulatedProcess>, AzaharNotResponding>;

    /**
     * Points later reads at a process. Without it, reads hit whatever process is running.
     *
     * @param processId - The process to read from, from `listProcesses`.
     */
    readonly selectProcess: (processId: number) => Effect.Effect<void, AzaharNotResponding>;

    /**
     * Reads memory from the selected process.
     *
     * @param address - Virtual address in the process to start reading at.
     * @param size - Number of bytes to read. Any size works.
     * @returns The bytes read. Fails with `MemoryReadFailed` if the process is gone.
     */
    readonly readMemory: (
      address: number,
      size: number
    ) => Effect.Effect<Uint8Array, AzaharNotResponding | MemoryReadFailed>;
  }
>()('mm3d-tracker/main/azahar/AzaharRpc') {
  /** Azahar RPC live layer. */
  static readonly layer = Layer.effect(
    AzaharRpc,
    Effect.gen(function* () {
      const socket = yield* DatagramSocket.DatagramSocket;
      // Opening the socket only fails if the OS refuses one, and the tracker can't run without it.
      const reader = yield* socket.reader.pipe(Effect.orDie);
      const writer = yield* socket.writer;

      // Replies arrive on one socket, so each request waits on its own entry, keyed by its ID.
      const pending = new Map<
        number,
        { type: RequestType; reply: Deferred.Deferred<Uint8Array> }
      >();
      let nextId = 0;

      /** Hands an incoming packet to the request waiting on it, or drops it if none is. */
      const routeIncomingPacket = (packet: Uint8Array) => {
        const reply = decodeReply(packet);
        if (!reply) return Effect.void;

        const waiting = pending.get(reply.id);
        if (!waiting || reply.type !== waiting.type) return Effect.void;

        return Deferred.succeed(waiting.reply, reply.payload);
      };

      yield* reader.pull.pipe(
        Effect.flatMap(Effect.forEach((datagram) => routeIncomingPacket(datagram.payload))),
        Effect.forever,
        // Only fails if the socket closes under it. Requests then time out, so log why.
        Effect.tapError((error) => Effect.logError('Azahar reply loop stopped', error)),
        Effect.forkScoped
      );

      /**
       * Sends one request and waits for its reply, with a timeout and retries.
       *
       * @param type - Which request to send.
       * @param args - The request's two u32 arguments.
       * @returns The reply's payload.
       */
      const request = Effect.fnUntraced(
        function* (type: RequestType, args: readonly [number, number]) {
          const id = nextId;
          nextId = (nextId + 1) >>> 0;

          const reply = yield* Deferred.make<Uint8Array>();
          pending.set(id, { type, reply });

          return yield* writer.write({ payload: encodeRequest(id, type, args) }).pipe(
            Effect.andThen(Deferred.await(reply)),
            Effect.timeoutOrElse({
              duration: replyTimeout,
              orElse: () => Effect.fail(new AzaharNotResponding())
            }),
            // A failed send looks the same to the player as no reply.
            Effect.catchTag('DatagramSocketError', () => Effect.fail(new AzaharNotResponding())),
            Effect.ensuring(Effect.sync(() => pending.delete(id)))
          );
        },
        // UDP can drop packets, so a lost reply gets a couple more tries.
        Effect.retry({ times: 2 })
      );

      const readMemory = Effect.fn('AzaharRpc.readMemory')(function* (
        address: number,
        size: number
      ) {
        const data = new Uint8Array(size);

        // Azahar caps each reply, so read in chunks and copy each one into place.
        for (let offset = 0; offset < size; offset += maxPayloadSize) {
          const chunkSize = Math.min(maxPayloadSize, size - offset);
          const chunk = yield* request(RequestType.ReadMemory, [address + offset, chunkSize]);
          // A short reply means Azahar couldn't read it, which happens once the process is gone.
          if (chunk.length !== chunkSize) {
            return yield* new MemoryReadFailed({ address: address + offset });
          }

          data.set(chunk, offset);
        }

        return data;
      });

      return AzaharRpc.of({
        listProcesses: request(RequestType.ProcessList, [0, 0xffffffff]).pipe(
          Effect.map(decodeProcessList)
        ),
        selectProcess: (processId) =>
          request(RequestType.SetGetProcess, [1, processId]).pipe(Effect.asVoid),
        readMemory
      });
    })
  ).pipe(
    // Connected, so the kernel drops packets from any other address and nothing else on the
    // network can feed the tracker fake replies.
    Layer.provide(NodeDatagramSocket.layer({ connect: { address: rpcAddress, port: rpcPort } }))
  );
}
