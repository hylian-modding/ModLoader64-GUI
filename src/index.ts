'use strict';
import path from 'path';
import { app, BrowserWindow, Menu, ipcMain, dialog, globalShortcut, shell } from 'electron';
import { is, api } from 'electron-util';
import unhandled from 'electron-unhandled';
import debug from 'electron-debug';
import contextMenu from 'electron-context-menu';
import { fork, ForkOptions, exec } from 'child_process';
import { MessageLayer } from './MessageLayer';
import { TunnelMessageHandler, GUITunnelPacket } from './GUITunnel';
import { ModManager, ModLoadOrder } from './ModManager';
import fs from 'fs';
import { GUIValues } from './GUIValues';
import { RomManager } from './RomManager';
import { DiscordIntegration } from './discord/discord';
import { ModLoaderErrorCodes } from './ModLoaderErrorCodes';
import { ModLoader64GUIConfig } from './ModLoader64GUIConfig';

//require('source-map-support').install();

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
const HIDE_BARS: boolean = true;

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
		config['ModLoader64'].rom = values.rom;
		if (values.isOffline || values.selfhost) {
			config['NetworkEngine.Client'].isSinglePlayer = true;
		}
		if (!values.isOffline && !values.selfhost) {
			config['NetworkEngine.Client'].isSinglePlayer = false;
		}
		config['NetworkEngine.Client'].ip = values.serverIP;
		config['NetworkEngine.Client'].port = values.serverPort;
		config['NetworkEngine.Client'].forceServerOverride = values.alternateConnection;
		config["ModLoader64"].isServer = false;
		config["ModLoader64"].isClient = true;
		rom = values.rom;
		let found = false;
		let patches: Array<string> = [];
		this.findBPS(values.data, patches);
		for (let i = 0; i < patches.length; i++) {
			let parse = path.parse(patches[i]);
			if (parse.ext === '.bps') {
				console.log(parse.base);
				config['ModLoader64'].patch = parse.base;
				found = true;
			}
		}
		if (!found) {
			config['ModLoader64'].patch = '';
		}
		fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
		startModLoader();
	}

	@TunnelMessageHandler('onModStatusChanged')
	onModStatusChanged(data: any) {
		fs.writeFileSync("./user_mod_list.json", JSON.stringify(data, null, 2));
		this.findEnabledMods(data, mods.reinitLoadOrder());
		mods.saveLoadOrder();
	}

	private findEnabledMods(root: any, order: ModLoadOrder) {
		if (root.hasOwnProperty("children")) {
			let children: Array<any> = root.children;
			for (let i = 0; i < children.length; i++) {
				this.findEnabledMods(children[i], order);
			}
		}
		if (root.hasOwnProperty("_checked")) {
			order.loadOrder[path.parse(root.attributes.file).base] = root._checked;
		}
	}

	private findBPS(root: any, patches: Array<string>) {
		if (root.hasOwnProperty("children")) {
			let children: Array<any> = root.children;
			for (let i = 0; i < children.length; i++) {
				this.findBPS(children[i], patches);
			}
		}
		if (root.hasOwnProperty("_checked")) {
			if (root._checked) {
				patches.push(root.attributes.file);
			}
		}
	}

	@TunnelMessageHandler('onModListLoaded')
	onModListLoaded(data: any) {
		fs.writeFileSync("./base_mod_list.json", JSON.stringify(data, null, 2));
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
			mods.scanMods('./ModLoader', 'mods');
			handlers.layer.send('readMods', mods);
		});
	}

	@TunnelMessageHandler('refreshMods')
	onrefreshMods(evt: any) {
		console.log("Trying to refresh mods tab...");
		mods = new ModManager();
		mods.scanMods('./ModLoader', 'mods');
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

	@TunnelMessageHandler("modBrowser")
	async onmodBrowser(evt: any) {
		const win = new BrowserWindow({
			title: app.name,
			show: false,
			width: 1024,
			height: 768,
			webPreferences: {
				nodeIntegration: true,
			},
			frame: true,
		});
		win.on('ready-to-show', () => {
			win.show();
			mod_browser_handlers = new ModBrowserHandlers(win.webContents, ipcMain);
			mod_browser_handlers.layer.send("readMods", mods);
		});
		await win.loadFile(path.join(__dirname, 'mod_browser.html'));
	}

	@TunnelMessageHandler("openModsFolder")
	onModsFolder(evt: any) {
		shell.openItem(path.resolve("./ModLoader/mods"));
	}
	@TunnelMessageHandler("openRomsFolder")
	openRomsFolder(evt: any) {
		shell.openItem(path.resolve("./ModLoader/roms"));
	}

}

class RunningWindowHandlers {
	layer: MessageLayer;

	constructor(emitter: any, retriever: any) {
		this.layer = new MessageLayer('internal_event_bus', emitter, retriever);
		this.layer.setupMessageProcessor(this);
	}
}

class ModBrowserHandlers {
	layer: MessageLayer;

	constructor(emitter: any, retriever: any) {
		this.layer = new MessageLayer('internal_event_bus', emitter, retriever);
		this.layer.setupMessageProcessor(this);
	}
}

let handlers: NodeSideMessageHandlers;
let running_handlers: RunningWindowHandlers;
let loading_handlers: RunningWindowHandlers;
let mod_browser_handlers: ModBrowserHandlers;

const createLoadingWindow = async () => {
	const win = new BrowserWindow({
		title: app.name,
		show: false,
		width: 400,
		height: 220,
		webPreferences: {
			nodeIntegration: true,
		},
		frame: false,
	});
	loading_handlers = new RunningWindowHandlers(win.webContents, ipcMain);
	win.on('ready-to-show', () => {
		win.show();
		console.log('TRYING TO UPDATE MODLOADER');
		loading_handlers.layer.send("onLoadingStep", "Updating ModLoader...");
		updateProcess = fork(__dirname + '/updateModLoader.js');
		updateProcess.on('exit', (code: number, signal: string) => {
			console.log('TRYING TO UPDATE PLUGINS');
			loading_handlers.layer.send("onLoadingStep", "Updating cores...");
			updateProcess = fork(__dirname + '/updateCores.js');
			updateProcess.on('exit', (code: number, signal: string) => {
				loading_handlers.layer.send("onLoadingStep", "Updating mods...");
				updateProcess = fork(__dirname + '/updatePlugins.js');
				updateProcess.on('exit', (code: number, signal: string) => {
					if (!fs.existsSync('./ModLoader/ModLoader64-config.json')) {
						updateProcess = null;
						return;
					}
					console.log('TRYING TO UPDATE GUI');
					loading_handlers.layer.send("onLoadingStep", "Updating launcher...");
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
	let cfg: ModLoader64GUIConfig = new ModLoader64GUIConfig().fromFile(JSON.parse(fs.readFileSync("./ModLoader64-GUI-config.json").toString()));
	fs.writeFileSync("./ModLoader64-GUI-config.json", JSON.stringify(cfg, null, 2));
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
				mods.scanMods('./ModLoader', 'mods');
				roms = new RomManager();
				roms.getRoms();
				clearInterval(transitionTimer);
				handlers.layer.send('readMods', mods);
				handlers.layer.send('readRoms', roms);
				handlers.layer.send('readGUIConfig', cfg);
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
					console.log("Loading Mupen config...");
					if (fs.existsSync(path.join(".", "ModLoader", "emulator", "mupen64plus.cfg"))) {
						let mupen: string = fs.readFileSync(path.join(".", "ModLoader", "emulator", "mupen64plus.cfg")).toString();
						let lines = mupen.split("\n");
						let opts: any = {};
						for (let i = 0; i < lines.length; i++) {
							if (lines[i].indexOf("[") > -1) {
								continue;
							}
							if (lines[i].indexOf("#") > -1) {
								continue;
							}
							if (lines[i].trim() === "") {
								continue;
							}
							let s = lines[i].split("=");
							opts[s[0].trim()] = s[1].trim().replace(/['"]+/g, "");
						}
						console.log(JSON.stringify(opts, null, 2));
					}
				}
				loadingWindow.close();
				if (!fs.existsSync('./ModLoader/src/version.js')) {
					dialog.showErrorBox("ModLoader64 has crashed!", "Failed to install ModLoader core files. Restart this program to enter repair mode.");
					if (fs.existsSync("./update.json")) {
						fs.unlinkSync("./update.json");
					}
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
				if (HIDE_BARS) {
					win.removeMenu();
				}
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
	if (HIDE_BARS) {
		Menu.setApplicationMenu(null);
	}
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
