import { MessageLayer, MessageProcessor } from "./MessageLayer";
import { ipcRenderer } from 'electron';

class WebSideMessageHandlers {
	layer: MessageLayer;

	constructor(emitter: any, retriever: any) {
		this.layer = new MessageLayer(emitter, retriever, "send");
		this.layer.setupMessageProcessor(this);
	}

	doSetup() {
		this.layer.emit("electronSetup", {});
	}

	@MessageProcessor("onStatus")
	onStatus(status: string) {
		let elem = document.getElementById("text");
		if (elem !== null) {
			elem.textContent = status;
		}
	}
}

const handlers = new WebSideMessageHandlers(ipcRenderer, ipcRenderer);

document.addEventListener("DOMContentLoaded", () => {
	setTimeout(() => {
		handlers.doSetup();
	}, 100);
});
