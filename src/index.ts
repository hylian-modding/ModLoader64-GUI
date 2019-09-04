'use strict';
import path from 'path';
import { app, BrowserWindow, Menu, ipcMain } from 'electron';
/// const {autoUpdater} = require('electron-updater');
import { is } from 'electron-util';
import unhandled from 'electron-unhandled';
import debug from 'electron-debug';
import contextMenu from 'electron-context-menu';
import { Pak } from './PakFormat';
import { fork, ForkOptions } from 'child_process';
import fs from 'fs';
import menu from './menu';
import { MessageLayer, MessageProcessor } from './MessageLayer';

require('source-map-support').install();

unhandled();
//debug();
contextMenu();

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
let mainWindow: any;

class NodeSideMessageHandlers {
	layer: MessageLayer;

	constructor(emitter: any, retriever: any) {
		this.layer = new MessageLayer(emitter, retriever, "send");
		this.layer.setupMessageProcessor(this);
	}

	@MessageProcessor("electronSetup")
	onTest(obj: any) {
		startModLoader();
	}
}

var handlers: NodeSideMessageHandlers;

const createMainWindow = async () => {
	const win = new BrowserWindow({
		title: app.getName(),
		show: false,
		width: 600,
		height: 400,
		webPreferences: {
			nodeIntegration: true
		}
	});

	win.on('ready-to-show', () => {
		win.show();
	});

	win.on('closed', () => {
		// Dereference the window
		// For multiple windows store them in an array
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
	mainWindow = await createMainWindow();
})();

function startModLoader() {
	if (fs.existsSync("./ModLoader.pak")) {
		handlers.layer.emit("onStatus", "Extracting update...");
		let pak: Pak = new Pak("./ModLoader.pak");
		pak.extractAll("./");
	}
	const options = {
		stdio: ['pipe', 'pipe', 'pipe', 'ipc']
	};
	handlers.layer.emit("onStatus", "Spinning up...");
	let ml = fork("./ModLoader/src/index.js", ['--dir=./ModLoader'], options as ForkOptions);
	ml.on('message', message => {
		let evt: any = JSON.parse(message);
		handlers.layer.emit("onStatus", evt.id);
	});
}
