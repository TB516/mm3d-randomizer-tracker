import { contextBridge, ipcRenderer } from 'electron';

import { channels } from '../shared/ipc';
import type { ChecksNeeds, TrackerState } from '../shared/tracker-state';

/** The renderer's whole view of the main process. It never sees Electron or Effect directly. */
const api = {
  /**
   * Watches the tracker over a private channel.
   *
   * @param onState - Called with the current state, then with each change to it.
   * @returns A function that stops watching.
   */
  watchTracker: (onState: (state: TrackerState) => void): (() => void) => {
    const { port1, port2 } = new MessageChannel();
    port1.onmessage = (message: MessageEvent<TrackerState>) => onState(message.data);
    ipcRenderer.postMessage(channels.watchTracker, null, [port2]);

    return () => port1.close();
  },

  /**
   * Opens the file picker and switches the tracker to the chosen seed. Does nothing if the picker
   * is cancelled.
   */
  chooseSeed: (): Promise<void> => ipcRenderer.invoke(channels.chooseSeed),

  /** Drops the connection to the game and starts reaching it again. */
  restartTracking: (): Promise<void> => ipcRenderer.invoke(channels.restartTracking),

  /**
   * Works out which items would bring checks into logic.
   *
   * @param ids - The checks' `id`s from the state.
   * @returns The checks out of logic and not collected, by ID.
   */
  findChecksNeeds: (ids: ReadonlyArray<number>): Promise<ChecksNeeds> =>
    ipcRenderer.invoke(channels.findChecksNeeds, ids)
  // One function per channel, so neither side can gain one the other lacks.
} satisfies Record<keyof typeof channels, unknown>;

export type Api = typeof api;

contextBridge.exposeInMainWorld('api', api);
