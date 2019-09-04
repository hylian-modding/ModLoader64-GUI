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
		let elem = document.getElementById("text");
		if (elem !== null) {
			elem.textContent = status;
		}
	}
}

const handlers = new WebSideMessageHandlers(ipcRenderer, ipcRenderer);

window.addEventListener("gamepadconnected", function (evt: any) {
	console.log(evt.gamepad);
	if (evt.gamepad["vibrationActuator"] !== null) {
		evt.gamepad.vibrationActuator.playEffect("dual-rumble", {
			startDelay: 0,
			duration: 1000,
			weakMagnitude: 1.0,
			strongMagnitude: 1.0
		});
	}
	console.log(evt.gamepad.buttons[0]);
});

document.addEventListener("DOMContentLoaded", () => {
	setTimeout(() => {
		handlers.doSetup();
	}, 100);
});
