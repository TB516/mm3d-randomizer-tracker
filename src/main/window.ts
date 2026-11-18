import { join } from 'node:path';

import { is } from '@electron-toolkit/utils';
import { BrowserWindow } from 'electron';

import icon from '../../resources/icon.png?asset';

export const createWindow = (): BrowserWindow => {
  const window = new BrowserWindow({
    // The size to restore to after un-maximizing. The window opens maximized.
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  });

  // Opens maximized: the map, the inventory and the longest zones' checks all fit at 1080p.
  window.on('ready-to-show', () => {
    window.maximize();
    window.show();
  });

  // Nothing in the app opens new windows from the page itself.
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  const rendererUrl = process.env['ELECTRON_RENDERER_URL'];
  if (is.dev && rendererUrl) {
    void window.loadURL(rendererUrl);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return window;
};
