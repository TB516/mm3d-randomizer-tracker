import { electronApp, optimizer } from '@electron-toolkit/utils';
import { Layer, ManagedRuntime } from 'effect';
import { app, BrowserWindow } from 'electron';

import { GameConnection } from './game/connection';
import { setupIpc } from './ipc';
import { CurrentSeed } from './seed/current-seed';
import { Tracker } from './tracker';
import { createWindow } from './window';

const runtime = ManagedRuntime.make(
  Layer.mergeAll(Tracker.layer, CurrentSeed.layer, GameConnection.layer)
);

app.whenReady().then(() => {
  electronApp.setAppUserModelId('io.github.tb516.mm3d-tracker');

  // F12 toggles DevTools in development; reload shortcuts are disabled in production.
  app.on('browser-window-created', (_event, window) =>
    optimizer.watchWindowShortcuts(window, { zoom: true })
  );

  setupIpc(runtime);
  createWindow();

  // macOS keeps the app running without windows, so reopen one from the dock.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Stops tracking and closes the RPC socket.
app.on('will-quit', () => void runtime.dispose());
