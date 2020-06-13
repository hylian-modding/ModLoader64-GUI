import { MessageLayer } from './MessageLayer';
import { ipcRenderer } from 'electron';
import { TunnelMessageHandler } from './GUITunnel';
import { ModManager, Mod } from './ModManager';
import unhandled from 'electron-unhandled';

unhandled();

let MODS: Array<string> = [];

class WebSideMessageHandlers {
	layer: MessageLayer;

	constructor(emitter: any, retriever: any) {
		this.layer = new MessageLayer('internal_event_bus', emitter, retriever);
		this.layer.setupMessageProcessor(this);
	}

	@TunnelMessageHandler('readMods')
	onMods(mods: ModManager) {
		mods.mods.forEach((mod: Mod) => {
			MODS.push(mod.meta["name"]);
		});
	}

}

const handlers = new WebSideMessageHandlers(ipcRenderer, ipcRenderer);

const hooks = {onModsLoaded: ()=>{return MODS}};

module.exports = hooks;
