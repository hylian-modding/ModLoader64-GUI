'use strict';
import path from 'path';
import { app, BrowserWindow, Menu, ipcMain } from 'electron';
/// const {autoUpdater} = require('electron-updater');
import { is } from 'electron-util';
import unhandled from 'electron-unhandled';
import debug from 'electron-debug';
import contextMenu from 'electron-context-menu';
import { fork, ForkOptions } from 'child_process';
import menu from './menu';
import { MessageLayer } from './MessageLayer';
import { TunnelMessageHandler, GUITunnelPacket } from './GUITunnel';
import { ModManager } from './ModManager';
import fs from 'fs';

require('source-map-support').install();

unhandled();
//debug();
//contextMenu();

// Note: Must match `build.appId` in package.json
app.setAppUserModelId('com.hylianmodding.modloader64-gui');

// Uncomment this before publishing your first version.
// It's commented out as it throws an error if there are no published versions.
// if (!is.development) {
// 	const FOUR_HOURS = 1000 * 60 * 60 * 4;
// 	setInterval(() => {
// 		autoUpdater.checkForUpdates();
// 	}, FOUR_HOURS);
//
// 	autoUpdater.checkForUpdates();
// }

// Prevent window from being garbage collected
let status: string;
let loadingWindow: any;
let mainWindow: any;
let ModLoader64: any;
let updateProcess: any;
let transitionTimer: any;
let runningWindow: any;
let mods: ModManager;

class NodeSideMessageHandlers {
  layer: MessageLayer;

  constructor(emitter: any, retriever: any) {
    this.layer = new MessageLayer('internal_event_bus', emitter, retriever);
    this.layer.setupMessageProcessor(this);
  }

  @TunnelMessageHandler('electronSetup')
  onSetup(obj: any) {}

  @TunnelMessageHandler('onStartButtonPressed')
  async onStart(obj: any) {
    startModLoader();
  }
}

let handlers: NodeSideMessageHandlers;

const createLoadingWindow = async () => {
  const win = new BrowserWindow({
    title: app.getName(),
    show: false,
    width: 400,
    height: 200,
    webPreferences: {
      nodeIntegration: true,
    },
    frame: false,
  });

  win.on('ready-to-show', () => {
    win.show();
    updateProcess = fork(__dirname + '/unpakUpdate.js');
    updateProcess.on('exit', (code: number, signal: string) => {
      if (code === 1852400485) {
        app.relaunch();
        app.exit();
      }
      updateProcess = null;
    });
  });

  win.on('closed', () => {
    loadingWindow = undefined;
  });

  await win.loadFile(path.join(__dirname, 'loading.html'));

  return win;
};

const createRunningWindow = async () => {
  const win = new BrowserWindow({
    title: app.getName(),
    show: false,
    width: 600,
    height: 400,
    x: mainWindow.x,
    y: mainWindow.y,
    webPreferences: {
      nodeIntegration: true,
    },
    frame: false,
  });

  win.on('ready-to-show', () => {
    win.show();
  });

  await win.loadFile(path.join(__dirname, 'running.html'));

  win.setPosition(mainWindow.getPosition()[0], mainWindow.getPosition()[1]);

  return win;
};

const createMainWindow = async () => {
  const win = new BrowserWindow({
    title: app.getName(),
    show: false,
    width: 600,
    height: 400,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  win.on('ready-to-show', () => {
    transitionTimer = setInterval(() => {
      if (loadingWindow && updateProcess == null) {
        loadingWindow.close();
        mods = new ModManager();
        mods.scanMods();
        win.show();
        clearInterval(transitionTimer);
        handlers.layer.send('readMods', mods);
        if (
          !fs.existsSync(path.join('./ModLoader', 'ModLoader64-config.json'))
        ) {
          // Need to generate the config.
          startModLoader();
          setInterval(() => {
            if (ModLoader64 !== null && status === 'onPostInitDone') {
              ModLoader64.kill();
            }
            if (ModLoader64 === null) {
              app.relaunch();
              app.exit();
            }
          }, 1000);
        }
      }
    }, 1000);
  });

  win.on('closed', () => {
    mainWindow = undefined;
  });

  await win.loadFile(path.join(__dirname, 'index.html'));

  //mainWindow.webContents.send("GUI_ConfigLoaded", {});
  handlers = new NodeSideMessageHandlers(win.webContents, ipcMain);
  return win;
};

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
  }
});

app.on('window-all-closed', () => {
  if (!is.macos) {
    app.quit();
  }
});

app.on('activate', () => {
  if (!mainWindow) {
    mainWindow = createMainWindow();
  }
});

(async () => {
  await app.whenReady();
  Menu.setApplicationMenu(menu);
  loadingWindow = await createLoadingWindow();
  mainWindow = await createMainWindow();
})();

function apiHandler(evt: GUITunnelPacket) {
  switch (evt.event) {
    case 'openWindow':
      let win = new BrowserWindow({
        title: app.getName(),
        show: false,
        width: evt.data[0].width,
        height: evt.data[0].height,
        webPreferences: {
          nodeIntegration: true,
        },
      });

      win.on('ready-to-show', () => {
        win.show();
        win.setParentWindow(runningWindow);
      });

      win.loadFile(evt.data[0].file);
      break;
  }
}

async function startModLoader() {
  mainWindow.hide();
  if (runningWindow === null || runningWindow === undefined) {
    runningWindow = await createRunningWindow();
  }
  const options = {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  };
  ModLoader64 = fork(
    './ModLoader/src/index.js',
    ['--dir=./ModLoader'],
    options as ForkOptions
  );
  ModLoader64.on('message', (message: string) => {
    let evt: GUITunnelPacket = JSON.parse(message);
    if (evt.id === 'internal_event_bus') {
      handlers.layer.send('onStatus', evt.event);
      status = evt.event as string;
    } else if (evt.id === 'modloader64_api') {
      apiHandler(evt);
    } else {
      handlers.layer.send(evt.event as string, evt);
    }
  });
  ModLoader64.on('exit', () => {
    try {
      mainWindow.setPosition(
        runningWindow.getPosition()[0],
        runningWindow.getPosition()[1]
      );
      runningWindow.close();
      runningWindow = null;
      mainWindow.show();
      ModLoader64 = null;
    } catch (err) {}
  });
}
