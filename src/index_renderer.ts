import { MessageLayer } from './MessageLayer';
import { ipcRenderer } from 'electron';
import { TunnelMessageHandler, GUITunnelPacket } from './GUITunnel';
import { ModManager, Mod, ModStatus } from './ModManager';
import { GUIValues } from './GUIValues';
import { RomManager, Rom } from './RomManager';

const hooks = { hooks: { console(msg: string) { } } };
const servers = require('./servers');

function getSelectedOption(sel: HTMLSelectElement) {
	let opt;
	for (let i = 0, len = sel.options.length; i < len; i++) {
		opt = sel.options[i];
		if (opt.selected === true) {
			break;
		}
	}
	return opt;
}

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

	get selectedServer(): string {
		let _server: HTMLSelectElement = document.getElementById(
			'cc'
		) as HTMLSelectElement;
		let selected = getSelectedOption(_server) as HTMLOptionElement;
		let value = selected.text;
		for (let i = 0; i < servers.length; i++) {
			if (value === servers[i].name) {
				return servers[i].url + ':' + servers[i].port;
			}
		}
		return '';
	}

	set selectedServer(ip: string) {
		let _server: HTMLSelectElement = document.getElementById(
			'cc'
		) as HTMLSelectElement;
		for (let i = 0; i < servers.length; i++) {
			if (ip === servers[i].ip) {
				for (let k = 0; k < _server.options.length; k++) {
					if (_server.options[k].text === servers[i].name) {
						_server.selectedIndex = k;
						break;
					}
				}
			}
		}
	}

	get selectedRom(): string {
		return SELECTED_ROM;
	}

	set selectedRom(rom: string) {
		SELECTED_ROM = rom;
	}
}

const formHandler: GeneralFormHandler = new GeneralFormHandler();

function injectItemElement_ModsTab(mod: Mod) {
	let parent = document.getElementById(mod.category as string);
	if (parent !== null && parent !== undefined) {
		let entry = document.createElement('div');
		let chk = document.createElement('input');
		chk.id = mod.meta.name;
		entry.appendChild(chk);
		let icon = document.createElement('img');
		icon.src = 'data:image/' + mod.type + ';base64, ' + mod.icon;
		icon.width = 32;
		icon.height = 32;
		entry.appendChild(icon);
		let text = document.createElement('span');
		text.textContent = ' ' + mod.meta.name + ' ' + mod.meta.version;
		entry.appendChild(text);
		parent.appendChild(entry);
		let box;
		box = $('#' + mod.meta.name);
		let isChecked = true;
		if (mod.file.indexOf('.disabled') > -1) {
			isChecked = false;
		}
		//@ts-ignore
		box.checkbox({
			checked: isChecked,
			onChange: (checked: boolean) => {
				let status: ModStatus = new ModStatus(mod);
				status.enabled = checked;
				handlers.layer.send('onModStatusChanged', status);
			},
		});
	}
}

let SELECTED_ROM = '';

function injectItemElement_RomsTab(
	parentName: string,
	name: string,
	_icon: string,
	version: string,
	elemBaseName?: string
) {
	let parent = document.getElementById(parentName);
	if (parent !== null && parent !== undefined) {
		let entry = document.createElement('div');
		let chk = document.createElement('input');
		if (elemBaseName !== null && elemBaseName !== undefined) {
			chk.setAttribute('data-id', elemBaseName);
			chk.id = elemBaseName;
		} else {
			chk.setAttribute('data-id', name);
			chk.id = name;
		}
		chk.name = 'selectedRom';
		entry.appendChild(chk);
    /* let icon = document.createElement('img');
		icon.src = 'data:image/png;base64, ' + _icon;
		icon.width = 30;
		icon.height = 30;
		entry.appendChild(icon); */
		let text = document.createElement('span');
		if (elemBaseName !== null && elemBaseName !== undefined) {
			text.id = elemBaseName + '_span';
		} else {
			text.id = name + '_span';
		}
		text.textContent = ' ' + name + ' ' + version;
		entry.appendChild(text);
		parent.appendChild(entry);
		let jq;
		if (elemBaseName !== null && elemBaseName !== undefined) {
			jq = $('#' + elemBaseName);
		} else {
			jq = $('#' + name);
		}
		//@ts-ignore
		jq.radiobutton({
			checked: false,
			onChange: (checked: boolean) => {
				if (checked) {
					SELECTED_ROM = name;
				}
			},
		});
	}
}

class WebSideMessageHandlers {
	layer: MessageLayer;

	constructor(emitter: any, retriever: any) {
		this.layer = new MessageLayer('internal_event_bus', emitter, retriever);
		this.layer.setupMessageProcessor(this);
	}

	doSetup() {
		this.layer.send('electronSetup', {});
	}

	@TunnelMessageHandler('onStatus')
	onStatus(status: string) { }

	@TunnelMessageHandler('readMods')
	onMods(mods: ModManager) {
		mods.mods.forEach((mod: Mod) => {
			injectItemElement_ModsTab(mod);
		});
	}

	@TunnelMessageHandler('readRoms')
	onRoms(roms: RomManager) {
		roms.roms.forEach((rom: Rom) => {
			injectItemElement_RomsTab('_roms', rom.filename, '', '', rom.hash);
		});
	}

	@TunnelMessageHandler('onConfigLoaded')
	onConfigLoaded(config: any) {
		formHandler.nickname = config['NetworkEngine.Client'].nickname;
		formHandler.lobby = config['NetworkEngine.Client'].lobby;
		formHandler.password = config['NetworkEngine.Client'].password;
		formHandler.selectedServer = config['NetworkEngine.Client'].ip;
		formHandler.selectedRom = config['ModLoader64'].rom;
	}

	@TunnelMessageHandler('onLog')
	onLog(msg: string) {
		hooks.hooks.console(msg);
		console.log(msg);
	}

	@TunnelMessageHandler('hashMismatch')
	onMismatch(evt: any) {
		alert('File mismatch found.');
	}

	@TunnelMessageHandler('hashMatch')
	onMatch(evt: any) {
		alert('No anomalies found.');
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
		handlers.layer.send(
			'onStartButtonPressed',
			new GUIValues(
				formHandler.nickname,
				formHandler.lobby,
				formHandler.password,
				formHandler.selectedRom,
				formHandler.selectedServer
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

module.exports = hooks;
