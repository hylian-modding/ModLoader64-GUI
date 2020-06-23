import { MessageLayer } from './MessageLayer';
import { ipcRenderer, TouchBarScrubber } from 'electron';
import { TunnelMessageHandler, GUITunnelPacket } from './GUITunnel';
import { ModManager, Mod } from './ModManager';
import { GUIValues } from './GUIValues';
import { RomManager, Rom } from './RomManager';
import unhandled from 'electron-unhandled';
import { ModLoader64GUIConfig } from './ModLoader64GUIConfig';
var deep = require('deep-equal');

unhandled();

//@ts-ignore
$.extend($.fn.textbox.methods, {
	//@ts-ignore
	show: function (jq) {
		return jq.each(function () {
			//@ts-ignore
			$(this).next().show();
		})
	},
	//@ts-ignore
	hide: function (jq) {
		return jq.each(function () {
			//@ts-ignore
			$(this).next().hide();
		})
	}
})

class GeneralFormHandler {
	get nickname(): string {
		let _nickname: HTMLInputElement = document.getElementById(
			'nickname'
		) as HTMLInputElement;
		return _nickname.value;
	}

	set nickname(nick: string) {
		let _nickname: HTMLInputElement = document.getElementById(
			'nickname'
		) as HTMLInputElement;
		_nickname.value = nick;
		//@ts-ignore
		$('#nickname').textbox('setText', nick);
	}

	get lobby(): string {
		let _lobby: HTMLInputElement = document.getElementById(
			'lobby'
		) as HTMLInputElement;
		return _lobby.value;
	}

	set lobby(lobby: string) {
		let _lobby: HTMLInputElement = document.getElementById(
			'lobby'
		) as HTMLInputElement;
		_lobby.value = lobby;
		//@ts-ignore
		$('#lobby').textbox('setText', lobby);
	}

	get password(): string {
		let _password: HTMLInputElement = document.getElementById(
			'password'
		) as HTMLInputElement;
		return _password.value;
	}

	set password(pw: string) {
		let _password: HTMLInputElement = document.getElementById(
			'password'
		) as HTMLInputElement;
		_password.value = pw;
		//@ts-ignore
		$('#password').textbox('setText', pw);
	}

	get selectedRom(): string {
		return SELECTED_ROM;
	}

	set selectedRom(rom: string) {
		SELECTED_ROM = rom;
	}

	get isOffline(): boolean {
		return $('input:checkbox[name=single_player]').is(':checked');
	}

	set isOffline(b: boolean) {
		if (b) {
			//@ts-ignore
			$('#single_player').checkbox('check');
		} else {
			//@ts-ignore
			$('#single_player').checkbox('uncheck');
		}
	}

	get serverIP(): string {
		let _s: HTMLInputElement = document.getElementById(
			'otherServerIP'
		) as HTMLInputElement;
		return _s.value;
	}

	set serverIP(s: string) {
		let _s: HTMLInputElement = document.getElementById(
			'otherServerIP'
		) as HTMLInputElement;
		_s.value = s;
		//@ts-ignore
		$('#otherServerIP').textbox('setText', s);
	}

	get serverPort(): string {
		let _s: HTMLInputElement = document.getElementById(
			'otherServerPort'
		) as HTMLInputElement;
		return _s.value;
	}

	set serverPort(s: string) {
		let _s: HTMLInputElement = document.getElementById(
			'otherServerPort'
		) as HTMLInputElement;
		_s.value = s;
		//@ts-ignore
		$('#otherServerPort').textbox('setText', s);
	}

	get selfhost(): boolean {
		//@ts-ignore
		return $('#selfHost').prop('checked');
	}

	set selfhost(b: boolean) {
		if (b) {
			//@ts-ignore
			$('#selfHost').switchbutton('check');
		}
	}

	get alternateConnection(): boolean {
		//@ts-ignore
		return $('#otherServer').prop('checked');
	}

	set alternateConnection(b: boolean) {
		if (b) {
			//@ts-ignore
			$('#otherServer').switchbutton('check');
		}
	}
}

const formHandler: GeneralFormHandler = new GeneralFormHandler();

let SELECTED_ROM = '';

class WebSideMessageHandlers {
	layer: MessageLayer;
	skipLoadOrder: boolean = false;
	timeouts: Array<any> = [];

	constructor(emitter: any, retriever: any) {
		this.layer = new MessageLayer('internal_event_bus', emitter, retriever);
		this.layer.setupMessageProcessor(this);
	}

	doSetup() {
		this.layer.send('electronSetup', {});
	}

	@TunnelMessageHandler('onStatus')
	onStatus(status: string) { }

	private folderGeneration(mods: ModManager, m: Map<string, any>) {
		mods.mods.forEach((mod: Mod) => {
			let key = mod.parentfolder + "/" + mod.subfolder;
			if (!m.has(key)) {
				let o = {
					text: mod.subfolder,
					children: [],
					state: 'closed',
					attributes: {
						subfolder: true
					}
				};
				let parent: any;
				m.forEach((value: any, key: string) => {
					if (value.text === mod.parentfolder) {
						parent = value;
					}
				});
				if (parent !== undefined) {
					if (parent.hasOwnProperty("children")) {
						(parent.children as Array<any>).push(o);
					}
					m.set(key, o);
				}
			}
		});
	}

	@TunnelMessageHandler('readMods')
	onMods(mods: ModManager) {
		let _mods = document.getElementById("_mods");
		if (_mods !== null) {
			_mods.innerHTML = "";
		}
		let _data = {
			text: 'mods',
			state: 'open',
			children: [],
			attributes: {
				root: true
			}
		};
		let m: Map<string, any> = new Map<string, any>();
		let icons: Map<string, string> = new Map<string, string>();
		m.set("mods", _data);
		m.set("ModLoader/mods", _data);
		for (let i = 0; i < mods.mods.length; i++) {
			this.folderGeneration(mods, m);
		}
		mods.mods.forEach((mod: Mod) => {
			let key = mod.parentfolder + "/" + mod.subfolder;
			if (m.has(key)) {
				let o = m.get(key)!;
				let r: any = {
					text: mod.meta.name,
					checked: false,
					attributes: {
						hash: mod.hash,
						parent: mod.parentfolder,
						mod: true,
						file: mod.file
					}
				};
				o.children.push(r);
			}
			if (mod.icon !== undefined) {
				if (mod.type === "gif") {
					icons.set(mod.meta.name, "data:image/gif;base64," + mod.icon);
				} else {
					icons.set(mod.meta.name, "data:image/png;base64," + mod.icon);
				}
			}
		});
		this.setupModTree(mods.baseguiData, _data, icons, mods.guiData);
	}

	private setupModTree(base: any, _data: any, icons: Map<string, string>, update: any = undefined) {
		//@ts-ignore
		$('#_mods').tree({
			data: [
				_data
			],
			dnd: true,
			animate: true,
			checkbox: function (node: any) {
				if (!node.hasOwnProperty("children")) {
					return true;
				}
			},
			onCheck: (node: any, checked: boolean) => {
				let clone = this.getRootData();
				this.layer.send('onModStatusChanged', clone);
			},
			loadFilter: (data: any, parent: any) => {
				function forNodes(data: any, callback: any) {
					var nodes = [];
					for (var i = 0; i < data.length; i++) {
						nodes.push(data[i]);
					}
					while (nodes.length) {
						var node = nodes.shift();
						if (callback(node) == false) { return; }
						if (node.children) {
							for (var i = node.children.length - 1; i >= 0; i--) {
								nodes.unshift(node.children[i]);
							}
						}
					}
				}
				forNodes(data, (node: any) => {
					this.timeouts.push(setTimeout(() => {
						if (icons.has(node.text)) {
							let e: HTMLElement | null = document.getElementById(node.domId);
							if (e !== null) {
								(e.children[2] as HTMLElement).style.background = "url('" + icons.get(node.text)! + "')";
								(e.children[2] as HTMLElement).style.backgroundSize = "32px";
								(e.children[2] as HTMLElement).style.width = "32px";
								(e.children[2] as HTMLElement).style.height = "32px";
								e.style.height = "32px";
								if ((e.children[3] as HTMLElement).className.indexOf("checkbox") === -1) {
									(e.children[3] as HTMLElement).className = "";
								}
							}
						}
					}, 1000));
				});
				return data;
			},
			onBeforeDrag: (node: any) => {
				if (node.attributes.hasOwnProperty("root")) {
					return false;
				}
				return true;
			},
			onDragOver: (target: HTMLElement, source: any) => {
				//@ts-ignore
				let node = $("#_mods").tree('getNode', target);
				if (node.hasOwnProperty("children")) {
					if (source.hasOwnProperty("children")) {
						return true;
					}
					return false;
				}
				return true;
			},
			onBeforeDrop: (target: HTMLElement, source: any, point: string) => {
				//@ts-ignore
				let node = $("#_mods").tree('getNode', target);
				if (point === "append") {
					return false;
				}
				if (node.attributes.hasOwnProperty("parent") && source.attributes.hasOwnProperty("parent")) {
					if (node.attributes.parent !== source.attributes.parent) {
						return false;
					}
				}
				return true;
			},
			onDrop: (target: HTMLElement, source: any, point: string) => {
				let clone = this.getRootData();
				this.layer.send('onModStatusChanged', clone);
			},
			onLoadSuccess: (node: any, data: any) => {
				if (this.skipLoadOrder) {
					return;
				}
				this.skipLoadOrder = true;
				let clone = this.getRootData();
				this.layer.send("onModListLoaded", clone);
				if (base === undefined) {
					return;
				}
				this.stripUselessDataforComparison(base);
				this.stripUselessDataforComparison(clone);
				if (update !== undefined) {
					console.log(base);
					console.log(clone);
					if (deep(base, clone)) {
						console.log("Loading load order data.");
						while (this.timeouts.length > 0) {
							let a = this.timeouts.shift();
							clearTimeout(a);
						}
						//@ts-ignore
						$('#_mods').tree('loadData', [update]);
					} else {
						console.log("Mods list changed...");
					}
				}
			}
		});
	}

	getRootData() {
		//@ts-ignore
		let root: any = $('#_mods').tree('getRoot');
		//@ts-ignore
		let data: Array<any> = $('#_mods').tree('getData', root.target);
		let clone = jQuery.extend(true, {}, data);
		this.cleanupTreeData(clone);
		return clone;
	}

	private cleanupTreeData(root: any) {
		if (root.hasOwnProperty("children")) {
			let children: Array<any> = root.children;
			for (let i = 0; i < children.length; i++) {
				this.cleanupTreeData(children[i]);
			}
		}
		if (root.hasOwnProperty("domId")) {
			delete root["domId"];
		}
		if (root.hasOwnProperty("target")) {
			delete root["target"];
		}
		if (root.hasOwnProperty("id")) {
			delete root["id"];
		}
	}

	private stripUselessDataforComparison(root: any) {
		if (root.hasOwnProperty("children")) {
			let children: Array<any> = root.children;
			for (let i = 0; i < children.length; i++) {
				this.cleanupTreeData(children[i]);
			}
		}
		if (root.hasOwnProperty("state")) {
			delete root["state"];
		}
		if (root.hasOwnProperty("checkState")) {
			delete root["checkState"];
		}
		if (root.hasOwnProperty("_checked")) {
			delete root["_checked"];
		}
	}

	@TunnelMessageHandler('readRoms')
	onRoms(roms: RomManager) {
		let _roms = document.getElementById("_roms");
		if (_roms !== null) {
			_roms.innerHTML = "";
		}
		let _data = {
			text: 'roms',
			state: 'open',
			children: []
		};
		let m: Map<string, any> = new Map<string, any>();
		m.set("roms", _data);
		m.set("ModLoader/roms", _data);
		let actualRomObjects: Map<string, any> = new Map<string, any>();
		roms.roms.forEach((rom: Rom) => {
			let key = rom.parentfolder + "/" + rom.subfolder;
			if (!m.has(key)) {
				let o = {
					text: rom.subfolder,
					children: [],
					state: 'closed',
					animate: true,
					attributes: {
						subfolder: true
					}
				};
				let parent: any;
				m.forEach((value: any, key: string) => {
					if (value.text === rom.parentfolder) {
						parent = value;
					}
				});
				if (parent !== undefined) {
					if (parent.hasOwnProperty("children")) {
						(parent.children as Array<any>).push(o);
					}
				}
				m.set(key, o);
			}
			if (m.has(key)) {
				let o = m.get(key)!;
				let r = {
					text: rom.filename,
					"checked": false,
					"attributes": {
						hash: rom.hash
					}
				};
				o.children.push(r);
				actualRomObjects.set(rom.filename, r);
			}
		});
		//@ts-ignore
		$('#_roms').tree({
			data: [
				_data
			],
			animate: true,
			checkbox: function (node: any) {
				if (!node.hasOwnProperty("children")) {
					return true;
				}
			},
			onCheck: (node: any, checked: boolean) => {
				actualRomObjects.forEach((value: any, key: string) => {
					//@ts-ignore
					let n = $('#_roms').tree('find', { text: value.text });
					//@ts-ignore
					$('#_roms').tree('update', {
						target: n.target,
						checked: false
					});
				});
				//@ts-ignore
				let n = $('#_roms').tree('find', { text: node.text });
				//@ts-ignore
				$('#_roms').tree('update', {
					target: n.target,
					checked: true
				});
				SELECTED_ROM = node.text;
			}
		});
		actualRomObjects.forEach((value: any, key: string) => {
			//@ts-ignore
			let n = $('#_roms').tree('find', { text: value.text });
			//@ts-ignore
			$('#_roms').tree('update', {
				target: n.target,
				checked: false
			});
		});
		setTimeout(() => {
			//@ts-ignore
			let n = $('#_roms').tree('find', { text: formHandler.selectedRom });
			if (n === null){
				return;
			}
			//@ts-ignore
			$('#_roms').tree('update', {
				target: n.target,
				checked: true
			});
		}, 1000);
	}

	@TunnelMessageHandler('onConfigLoaded')
	onConfigLoaded(config: any) {
		formHandler.nickname = config['NetworkEngine.Client'].nickname;
		formHandler.lobby = config['NetworkEngine.Client'].lobby;
		formHandler.password = config['NetworkEngine.Client'].password;
		formHandler.selectedRom = config['ModLoader64'].rom;
		formHandler.isOffline = config['NetworkEngine.Client'].isSinglePlayer;
		formHandler.alternateConnection = config['NetworkEngine.Client'].forceServerOverride;
		formHandler.selfhost = config['NetworkEngine.Client'].isSinglePlayer;
		formHandler.serverIP = config['NetworkEngine.Client'].ip;
		formHandler.serverPort = config['NetworkEngine.Client'].port;
	}

	@TunnelMessageHandler('onLog')
	onLog(msg: string) {
		console.log(msg);
	}

	@TunnelMessageHandler('readGUIConfig')
	onGUIConfig(gui: ModLoader64GUIConfig) {
		setTimeout(() => {
			if (!gui.showAdvancedTab) {
				//@ts-ignore
				var p = $('#tabs').tabs('getTab', 4);
				p.panel('options').tab.hide();
				p.panel('close');
			} else {

			}
		}, 1000);
	}
}

const handlers = new WebSideMessageHandlers(ipcRenderer, ipcRenderer);

document.addEventListener('DOMContentLoaded', () => {
	setTimeout(() => {
		handlers.doSetup();
	}, 100);
});

let startButton = document.getElementById('start');
if (startButton !== null) {
	startButton.addEventListener('click', () => {
		let clone = handlers.getRootData();
		handlers.layer.send('onModStatusChanged', clone);
		handlers.layer.send(
			'onStartButtonPressed',
			new GUIValues(
				formHandler.nickname,
				formHandler.lobby,
				formHandler.password,
				formHandler.selectedRom,
				formHandler.isOffline,
				formHandler.serverIP,
				formHandler.serverPort,
				formHandler.selfhost,
				formHandler.alternateConnection,
				clone
			)
		);
	});
}

let inputConfig = document.getElementById('input-config');
if (inputConfig !== null) {
	inputConfig.addEventListener('click', () => {
		handlers.layer.send('onInputConfig', {});
	});
}

let flips = document.getElementById('flips');
if (flips !== null) {
	flips.addEventListener('click', () => {
		handlers.layer.send('onFlips', {});
	});
}

let refreshMods = document.getElementById('refreshMods');
if (refreshMods !== null) {
	refreshMods.addEventListener('click', () => {
		handlers.layer.send('refreshMods', {});
	});
}

let refreshRoms = document.getElementById("refreshRoms");
if (refreshRoms !== null) {
	refreshRoms.addEventListener('click', () => {
		handlers.layer.send("refreshRoms", {});
	});
}

let modBrowser = document.getElementById("modBrowser");
if (modBrowser !== null) {
	modBrowser.addEventListener('click', () => {
		handlers.layer.send("modBrowser", {});
	});
}
