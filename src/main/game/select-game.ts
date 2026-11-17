import { Effect, Schema } from 'effect';

import { AzaharRpc } from '../azahar/rpc';

/** Azahar is running, but MM3D isn't one of its processes. */
export class GameNotRunning extends Schema.TaggedError<GameNotRunning>()('GameNotRunning', {}) {}

const mm3dTitleId = 0x0004000000125500n;

/** Finds MM3D among Azahar's processes and points reads at it. */
export const selectGame = Effect.gen(function* () {
  const rpc = yield* AzaharRpc;
  const processes = yield* rpc.listProcesses;
  const game = processes.find((process) => process.titleId === mm3dTitleId);
  if (!game) return yield* new GameNotRunning();

  yield* rpc.selectProcess(game.processId);
});
