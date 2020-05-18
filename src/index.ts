'use strict';
import path from 'path';
import { app, BrowserWindow, Menu, ipcMain, dialog, globalShortcut } from 'electron';
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
import request from 'request';
import crypto from 'crypto';
import { DiscordIntegration } from './discord/discord';
import { ModLoaderErrorCodes } from './ModLoaderErrorCodes';
import { ModLoader64GUIConfig } from './ModLoader64GUIConfig';

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
let discord: DiscordIntegration;
let rom = '';
let inputConfigChild: any;

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
		config['NetworkEngine.Client'].isSinglePlayer = values.isOffline;
		config['NetworkEngine.Client'].forceServerOverride = false;
		rom = values.rom;
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
		let p = "\"" + path.resolve('./ModLoader/InputConfigTool.exe') + "\"";
		if (process.platform.trim() !== 'win32') {
			p = p.replace('.exe', '');
		}
		console.log(p);
		if (inputConfigChild !== null && inputConfigChild !== undefined) {
			return;
		}
		inputConfigChild = exec(
			p,
			{
				cwd: path.resolve('./ModLoader'),
			},
			(error: any) => {
				if (error) {
					console.log(error);
				}
			}
		);
		inputConfigChild.on('exit', (code: number) => {
			console.log(code);
			inputConfigChild = undefined;
		});
	}

	@TunnelMessageHandler('onFlips')
	onFlips(evt: any) {
		let p = "\"" + path.resolve('./ModLoader/flips.exe') + "\"";
		if (process.platform.trim() !== 'win32') {
			p = p.replace('.exe', '');
		}
		let child = exec(
			p,
			{
				cwd: path.resolve('./ModLoader'),
			},
			(error: any) => {
				if (error) {
					console.log(error);
				}
			}
		);
		child.on('exit', (code: number) => {
			console.log("Trying to refresh mods tab...");
			mods = new ModManager();
			mods.scanMods('./ModLoader/cores', '_cores');
			mods.scanMods('./ModLoader/mods', '_mods');
			handlers.layer.send('readMods', mods);
		});
	}

	@TunnelMessageHandler('refreshMods')
	onrefreshMods(evt: any) {
		console.log("Trying to refresh mods tab...");
		mods = new ModManager();
		mods.scanMods('./ModLoader/cores', '_cores');
		mods.scanMods('./ModLoader/mods', '_mods');
		handlers.layer.send('readMods', mods);
	}

	@TunnelMessageHandler('refreshRoms')
	onrefreshRoms(evt: any) {
		console.log("Trying to refresh games tab...");
		roms = new RomManager();
		roms.getRoms();
		handlers.layer.send('readRoms', roms);
	}

	@TunnelMessageHandler('forwardToML')
	onForwardToML(evt: any) {
		ModLoader64.send(
			JSON.stringify(new GUITunnelPacket('forwardToML', evt.id, evt))
		);
	}
}

class RunningWindowHandlers {
	layer: MessageLayer;

	constructor(emitter: any, retriever: any) {
		this.layer = new MessageLayer('internal_event_bus', emitter, retriever);
		this.layer.setupMessageProcessor(this);
	}
}

let handlers: NodeSideMessageHandlers;
let running_handlers: RunningWindowHandlers;

const createLoadingWindow = async () => {
	const win = new BrowserWindow({
		title: app.name,
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
		console.log('TRYING TO UPDATE MODLOADER');
		updateProcess = fork(__dirname + '/updateModLoader.js');
		updateProcess.on('exit', (code: number, signal: string) => {
			console.log('TRYING TO UPDATE PLUGINS');
			updateProcess = fork(__dirname + '/updateCores.js');
			updateProcess.on('exit', (code: number, signal: string) => {
				updateProcess = fork(__dirname + '/updatePlugins.js');
				updateProcess.on('exit', (code: number, signal: string) => {
					if (!fs.existsSync('./ModLoader/ModLoader64-config.json')) {
						updateProcess = null;
						return;
					}
					console.log('TRYING TO UPDATE GUI');
					updateProcess = fork(__dirname + '/updateGUI.js');
					updateProcess.on('exit', (code: number, signal: string) => {
						console.log('GUI UPDATE CODE ' + code);
						if (code == 1852400485) {
							app.relaunch();
							app.exit();
						}
						updateProcess = null;
					});
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
		title: app.name,
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

	running_handlers = new RunningWindowHandlers(win.webContents, ipcMain);

	return win;
};

const createMainWindow = async () => {
	const win = new BrowserWindow({
		title: "",
		show: false,
		width: 600,
		height: 400,
		webPreferences: {
			nodeIntegration: true,
		},
	});
	if (!fs.existsSync("./ModLoader64-GUI-config.json")) {
		fs.writeFileSync("./ModLoader64-GUI-config.json", JSON.stringify(new ModLoader64GUIConfig(), null, 2));
	}
	let cfg: ModLoader64GUIConfig = JSON.parse(fs.readFileSync("./ModLoader64-GUI-config.json").toString());
	globalShortcut.register(cfg.keybindings.soft_reset.key, () => {
		let evt: any = { id: "SOFT_RESET_PRESSED", data: {} };
		if (ModLoader64 !== undefined || ModLoader64 !== null) {
			if (!ModLoader64.killed) {
				ModLoader64.send(
					JSON.stringify(new GUITunnelPacket('forwardToML', evt.id, evt))
				);
			}
		}
	})
	win.on('ready-to-show', () => {
		transitionTimer = setInterval(() => {
			if (loadingWindow && updateProcess == null) {
				discord = new DiscordIntegration();
				mods = new ModManager();
				mods.scanMods('./ModLoader/cores', '_cores');
				mods.scanMods('./ModLoader/mods', '_mods');
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
				if (!fs.existsSync('./ModLoader/src/version.js')) {
					dialog.showErrorBox("ModLoader64 has crashed!", "Failed to install ModLoader core files.");
					app.exit();
				}
				win.setTitle(
					"ModLoader64-GUI" +
					' ' +
					app.getVersion() +
					' | ' +
					'ModLoader64 ' +
					require(path.resolve('./ModLoader/src/version'))
				);
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

const API_WINDOWS: MessageLayer[] = new Array<MessageLayer>();

(async () => {
	await app.whenReady();
	Menu.setApplicationMenu(null);
	loadingWindow = await createLoadingWindow();
	mainWindow = await createMainWindow();
})();

function apiHandler(evt: GUITunnelPacket) {
	switch (evt.event) {
		case 'openWindow':
			let win = new BrowserWindow({
				title: app.name,
				show: false,
				width: evt.data[0].width,
				height: evt.data[0].height,
				webPreferences: {
					nodeIntegration: true,
				},
			});

			win.on('ready-to-show', () => {
				win.removeMenu();
				win.show();
				win.setParentWindow(runningWindow);
			});

			win.loadFile(evt.data[0].file);
			API_WINDOWS.push(
				new MessageLayer('modloader64_api_window', win.webContents, ipcMain)
			);
			break;
		case 'setDiscordStatus':
			discord.setActivity(evt.data[0]);
			break;
	}
}

async function startModLoader() {
	discord.setActivity({ details: 'Loading a game', state: rom });
	mainWindow.hide();
	API_WINDOWS.length = 0;
	if (runningWindow === null || runningWindow === undefined) {
		runningWindow = await createRunningWindow();
	}
	const options = {
		stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
	};
	console.log(path.resolve('./ModLoader/src/index.js'));
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
				} catch (err) { }
			}
		}
	});
	ModLoader64.on('exit', (code: number) => {
		console.log(code);
		if (code !== 0 && code < 100 && code !== null) {
			dialog.showErrorBox("ModLoader64 has crashed!", ModLoaderErrorCodes[code]);
		}
		try {
			mainWindow.setPosition(
				runningWindow.getPosition()[0],
				runningWindow.getPosition()[1]
			);
			runningWindow.close();
			runningWindow = null;
			mainWindow.show();
			ModLoader64 = null;
			discord.reset();
		} catch (err) { }
	});
	ModLoader64.stdout.on('data', (buf: Buffer) => {
		let msg: string = buf.toString();
		if (msg === '' || msg === null || msg === undefined) {
			return;
		}
		running_handlers.layer.send('onLog', msg);
		console.log(msg);
	});
}
