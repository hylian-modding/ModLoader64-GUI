import { MessageLayer } from "./MessageLayer";
import { ipcRenderer } from 'electron';
import { TunnelMessageHandler } from "./GUITunnel";

class WebSideMessageHandlers {
	layer: MessageLayer;

	constructor(emitter: any, retriever: any) {
		this.layer = new MessageLayer("internal_event_bus", emitter, retriever);
		this.layer.setupMessageProcessor(this);
	}

	doSetup() {
		this.layer.send("electronSetup", {});
	}

	@TunnelMessageHandler("onStatus")
	onStatus(status: string) {
	}
}

const handlers = new WebSideMessageHandlers(ipcRenderer, ipcRenderer);

document.addEventListener("DOMContentLoaded", () => {
	setTimeout(() => {
		handlers.doSetup();
	}, 100);
});

let startButton = document.getElementById("start");
if (startButton !== null) {
	startButton.addEventListener("click", () => {
		handlers.layer.send("onStartButtonPressed", {});
	});
}
