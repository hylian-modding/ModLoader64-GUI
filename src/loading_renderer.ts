import { MessageLayer } from './MessageLayer';
import { ipcRenderer } from 'electron';
import { TunnelMessageHandler, GUITunnelPacket } from './GUITunnel';
import unhandled from 'electron-unhandled';

unhandled();

class WebSideMessageHandlers {
	layer: MessageLayer;

	constructor(emitter: any, retriever: any) {
		this.layer = new MessageLayer('internal_event_bus', emitter, retriever);
		this.layer.setupMessageProcessor(this);
	}

	@TunnelMessageHandler('onLoadingStep')
	onLog(step: string) {
		document.getElementById("step")!.innerHTML = step;
	}
}

const handlers = new WebSideMessageHandlers(ipcRenderer, ipcRenderer);

module.exports = {};
