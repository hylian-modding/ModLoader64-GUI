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
import { MessageLayer } from './MessageLayer';
import { TunnelMessageHandler, GUITunnelPacket } from './GUITunnel';

require('source-map-support').install();

unhandled();
debug();
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
let ModLoader64: any;

class NodeSideMessageHandlers {
	layer: MessageLayer;

	constructor(emitter: any, retriever: any) {
		this.layer = new MessageLayer("internal_event_bus", emitter, retriever);
		this.layer.setupMessageProcessor(this);
	}

	@TunnelMessageHandler("electronSetup")
	onSetup(obj: any) {
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

function apiHandler(evt: GUITunnelPacket) {
	console.log(evt);
	switch (evt.event) {
		case "openWindow":
			let win = new BrowserWindow({
				title: app.getName(),
				show: false,
				width: evt.data[0].width,
				height: evt.data[0].height,
				webPreferences: {
					nodeIntegration: true
				}
			});

			win.on('ready-to-show', () => {
				win.show();
			});

			win.loadFile(evt.data[0].file);
			break;
	}
}

function startModLoader() {
	if (fs.existsSync("./ModLoader.pak")) {
		handlers.layer.send("onStatus", "Extracting update...");
		let pak: Pak = new Pak("./ModLoader.pak");
		pak.extractAll("./");
		fs.unlinkSync("./ModLoader.pak");
	}
	const options = {
		stdio: ['pipe', 'pipe', 'pipe', 'ipc']
	};
	handlers.layer.send("onStatus", "Spinning up...");
	ModLoader64 = fork("./ModLoader/src/index.js", ['--dir=./ModLoader'], options as ForkOptions);
	ModLoader64.on('message', (message: string) => {
		let evt: GUITunnelPacket = JSON.parse(message);
		if (evt.id === "internal_event_bus") {
			handlers.layer.send("onStatus", evt.event);
		} else if (evt.id === "modloader64_api") {
			apiHandler(evt);
		} else {
			handlers.layer.send(evt.event as string, evt);
		}
	});
}
