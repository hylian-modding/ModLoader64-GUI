'use strict';
import path from 'path';
import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { is, api } from 'electron-util';
import unhandled from 'electron-unhandled';
import debug from 'electron-debug';
import contextMenu from 'electron-context-menu';
import { fork, ForkOptions, exec } from 'child_process';
import { MessageLayer } from './MessageLayer';
import { TunnelMessageHandler, GUITunnelPacket } from './GUITunnel';
import { ModManager, ModStatus } from './ModManager';
import fs from 'fs';
import { GUIValues } from './GUIValues';
import { RomManager } from './RomManager';

require('source-map-support').install();

unhandled();
//debug();
//contextMenu();

// Note: Must match `build.appId` in package.json
app.setAppUserModelId('com.hylianmodding.modloader64-gui');

// Prevent window from being garbage collected
let status: string;
let loadingWindow: any;
let mainWindow: any;
let ModLoader64: any;
let updateProcess: any;
let transitionTimer: any;
let runningWindow: any;
let mods: ModManager;
let roms: RomManager;

class NodeSideMessageHandlers {
	layer: MessageLayer;

	constructor(emitter: any, retriever: any) {
		this.layer = new MessageLayer('internal_event_bus', emitter, retriever);
		this.layer.setupMessageProcessor(this);
	}

	@TunnelMessageHandler('electronSetup')
	onSetup(obj: any) { }

	@TunnelMessageHandler('onStartButtonPressed')
	async onStart(values: GUIValues) {
		console.log(values);
		let configPath: string = path.resolve(
			path.join('./ModLoader', 'ModLoader64-config.json')
		);
		let config: any = JSON.parse(fs.readFileSync(configPath).toString());
		config['NetworkEngine.Client'].nickname = values.nickname;
		config['NetworkEngine.Client'].lobby = values.lobby;
		config['NetworkEngine.Client'].password = values.password;
		config['ModLoader64'].isServer = false;
		config['ModLoader64'].rom = values.rom;
		config['NetworkEngine.Client'].ip = values.server.split(":")[0];
		config['NetworkEngine.Client'].port = values.server.split(":")[1];
		let found = false;
		fs.readdirSync('./ModLoader/mods').forEach((file: string) => {
			let parse = path.parse(file);
			if (parse.ext === '.bps') {
				config['ModLoader64'].patch = parse.base;
				found = true;
			}
		});
		if (!found) {
			config['ModLoader64'].patch = '';
		}
		fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
		startModLoader();
	}

	@TunnelMessageHandler('onModStatusChanged')
	onModStatusChanged(mod: ModStatus) {
		mods.changeStatus(mod);
	}

	@TunnelMessageHandler('onInputConfig')
	onInputConfigClick(evt: any) {
		let child = exec(path.resolve('./ModLoader/InputConfigTool.exe'), {
			cwd: path.resolve('./ModLoader')
		}, (error: any) => {
			if (error) {
				console.log(error);
			}
		});
		child.on('exit', (code: number) => {
			console.log(code);
		});
	}

	@TunnelMessageHandler("forwardToML")
	onForwardToML(evt: any) {
		ModLoader64.send(JSON.stringify(new GUITunnelPacket("forwardToML", evt.id, evt)));
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
		updateProcess = fork(__dirname + '/updateModLoader.js');
		updateProcess.on('exit', (code: number, signal: string) => {
			updateProcess = fork(__dirname + '/updatePlugins.js');
			updateProcess.on('exit', (code: number, signal: string) => {
				if (!fs.existsSync("./ModLoader/ModLoader64-config.json")) {
					updateProcess = null;
					return;
				}
				updateProcess = fork(__dirname + "/updateGUI.js");
				updateProcess.on('exit', (code: number, signal: string) => {
					if (code !== 0) {
						app.relaunch();
						app.exit();
					}
					updateProcess = null;
				});
			});
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
				mods = new ModManager();
				mods.scanMods();
				roms = new RomManager();
				roms.getRoms();
				clearInterval(transitionTimer);
				handlers.layer.send('readMods', mods);
				handlers.layer.send('readRoms', roms);
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
				} else {
					// We have a config.
					console.log('Loading config.');
					let config: any = JSON.parse(
						fs
							.readFileSync(path.join('./ModLoader', 'ModLoader64-config.json'))
							.toString()
					);
					console.log(config);
					handlers.layer.send('onConfigLoaded', config);
				}
				loadingWindow.close();
				win.setTitle(app.getName() + " " + app.getVersion() + " | " + "ModLoader64 " + require(path.resolve("./ModLoader/src/version")));
				win.removeMenu();
				win.show();
			}
		}, 1000);
	});

	win.on('closed', () => {
		mainWindow = undefined;
	});

	handlers = new NodeSideMessageHandlers(win.webContents, ipcMain);
	await win.loadFile(path.join(__dirname, 'index.html'));
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

const API_WINDOWS: Array<MessageLayer> = new Array<MessageLayer>();

(async () => {
	await app.whenReady();
	//Menu.setApplicationMenu(menu);
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
			API_WINDOWS.push(new MessageLayer('modloader64_api_window', win.webContents, ipcMain));
			break;
	}
}

async function startModLoader() {
	mainWindow.hide();
	API_WINDOWS.length = 0;
	if (runningWindow === null || runningWindow === undefined) {
		runningWindow = await createRunningWindow();
	}
	const options = {
		stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
	};
	console.log(path.resolve("./ModLoader/src/index.js"));
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
			handlers.layer.send(evt.event as string, evt.data[0]);
			for (let i = 0; i < API_WINDOWS.length; i++) {
				try {
					API_WINDOWS[i].send(evt.event as string, evt.data[0]);
				} catch (err) {
				}
			}
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
		} catch (err) { }
	});
	ModLoader64.on('data', (msg: string) => {
		handlers.layer.send("onLog", msg);
	});
}
