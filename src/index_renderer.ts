import { MessageLayer } from './MessageLayer';
import { ipcRenderer } from 'electron';
import { TunnelMessageHandler, GUITunnelPacket } from './GUITunnel';
import { ModManager, Mod, ModStatus } from './ModManager';
import { GUIValues } from './GUIValues';
import { RomManager, Rom } from './RomManager';
import unhandled from 'electron-unhandled';

unhandled();

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
}

const formHandler: GeneralFormHandler = new GeneralFormHandler();

function injectItemElement_ModsTab(mod: Mod) {
	let parent = document.getElementById(mod.category as string);
	if (parent !== null && parent !== undefined) {
		let entry = document.createElement('div');
		if (mod.category !== "_cores") {
			let chk = document.createElement('input');
			chk.id = mod.hash!;
			entry.appendChild(chk);
		}
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
		box = $('#' + mod.hash!);
		let isChecked = true;
		if (mod.file.indexOf('.disabled') > -1) {
			isChecked = false;
		}
		if (mod.category !== "_cores") {
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
		let _mods = document.getElementById("_mods");
		if (_mods !== null) {
			_mods.innerHTML = "";
			let h = document.createElement('h3');
			h.innerHTML = "Mods";
			_mods.appendChild(h);
		}
		let _patches = document.getElementById("_patches");
		if (_patches !== null) {
			_patches.innerHTML = "";
			let h = document.createElement('h3');
			h.innerHTML = "Patches";
			_patches.appendChild(h);
		}
		let _cores = document.getElementById("_cores");
		if (_cores !== null) {
			_cores.innerHTML = "";
			let h = document.createElement('h3');
			h.innerHTML = "Cores";
			_cores.appendChild(h);
		}
		mods.mods.forEach((mod: Mod) => {
			injectItemElement_ModsTab(mod);
		});
	}

	@TunnelMessageHandler('readRoms')
	onRoms(roms: RomManager) {
		let _roms = document.getElementById("_roms");
		if (_roms !== null){
			_roms.innerHTML = "";
		}
		roms.roms.forEach((rom: Rom) => {
			injectItemElement_RomsTab('_roms', rom.filename, '', '', rom.hash);
		});
	}

	@TunnelMessageHandler('onConfigLoaded')
	onConfigLoaded(config: any) {
		formHandler.nickname = config['NetworkEngine.Client'].nickname;
		formHandler.lobby = config['NetworkEngine.Client'].lobby;
		formHandler.password = config['NetworkEngine.Client'].password;
		formHandler.selectedRom = config['ModLoader64'].rom;
		formHandler.isOffline = config['NetworkEngine.Client'].isSinglePlayer;
	}

	@TunnelMessageHandler('onLog')
	onLog(msg: string) {
		console.log(msg);
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
				formHandler.isOffline
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
if (refreshMods !== null){
	refreshMods.addEventListener('click', ()=>{
		handlers.layer.send('refreshMods', {});
	});
}

let refreshRoms = document.getElementById("refreshRoms");
if (refreshRoms !== null){
	refreshRoms.addEventListener('click', ()=>{
		handlers.layer.send("refreshRoms", {});
	});
}

/*
let arr: Array<any> = [];
for (let i = 0; i < 20; i++){
	arr.push(JSON.parse(JSON.stringify({ Lobby: 'test1', Players: 1, Mods: "OotOnline", Locked: "🔒", Patch: "n/a" })));
}
setTimeout(() => {
	//@ts-ignore
	$("#browserTable").datagrid({
		data: arr
	});
	//@ts-ignore
	$('#browserTable').datagrid('clientPaging');
}, 5000); */


/* $.getJSON('https://nexus.inpureprojects.info/ModLoader64/repo/mods.json', {_: new Date().getTime()}, function (data) {
	Object.keys(data).forEach((key: string) => {
		//@ts-ignore
		$('#repoTable').datagrid('appendRow', { Name: data[key].name, Installed: true });
	});
	//@ts-ignore
	$('#repoTable').datagrid('clientPaging');
}); */

