import { Effect, Fiber, type ManagedRuntime, Stream } from 'effect';
import { BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron';

import { channels } from '../shared/ipc';
import { GameConnection } from './game/connection';
import { CurrentSeed } from './seed/current-seed';
import { Tracker } from './tracker';

const seedDialogOptions: OpenDialogOptions = {
  title: 'Choose a seed',
  properties: ['openFile'],
  filters: [{ name: 'Seed patch (code.ips)', extensions: ['ips'] }]
};

/**
 * Asks the player for a seed file and switches the tracker to it. Does nothing if they cancel.
 *
 * @param window - The window the file picker belongs to, so it stays in front of it.
 */
const chooseSeed = Effect.fn('chooseSeed')(function* (window: BrowserWindow | null) {
  const result = yield* Effect.promise(() => {
    if (!window) return dialog.showOpenDialog(seedDialogOptions);

    return dialog.showOpenDialog(window, seedDialogOptions);
  });

  // A cancelled picker returns no paths.
  const [path] = result.filePaths;
  if (!path) return;

  const seed = yield* CurrentSeed;
  yield* seed.load(path);
});

/**
 * Registers the main process's IPC handlers.
 *
 * @param runtime - The app's Effect runtime, which owns the services the handlers use.
 */
export const setupIpc = (
  runtime: ManagedRuntime.ManagedRuntime<Tracker | CurrentSeed | GameConnection, never>
) => {
  // Sends the tracker's state over the port the page sent, starting with the current state. The
  // port closes when the page reloads or closes, and that stops sending.
  ipcMain.on(channels.watchTracker, (event) => {
    const [port] = event.ports;
    if (!port) return;

    const send = Effect.gen(function* () {
      const tracker = yield* Tracker;
      yield* Stream.runForEach(tracker.changes, (state) =>
        Effect.sync(() => port.postMessage(state))
      );
    });
    const fiber = runtime.runFork(send);

    port.on('close', () => runtime.runFork(Fiber.interrupt(fiber)));
    port.start();
  });

  // The commands return nothing. What they change reaches the page through the state above.
  ipcMain.handle(channels.chooseSeed, (event) =>
    runtime.runPromise(chooseSeed(BrowserWindow.fromWebContents(event.sender)))
  );

  ipcMain.handle(channels.restartTracking, () =>
    runtime.runPromise(GameConnection.use((game) => game.restart))
  );

  // A question about the current state, not a command, so it answers directly.
  ipcMain.handle(channels.findChecksNeeds, (_event, ids: unknown) =>
    Array.isArray(ids) && ids.every((id) => typeof id === 'number')
      ? runtime.runPromise(Tracker.use((tracker) => tracker.findNeeds(ids)))
      : {}
  );
};
