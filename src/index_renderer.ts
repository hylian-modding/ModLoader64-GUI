import { MessageLayer } from "./MessageLayer";
import { ipcRenderer } from 'electron';
import { TunnelMessageHandler } from "./GUITunnel";
import { ModManager, Mod, Patch } from "./ModManager";

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

	@TunnelMessageHandler("readMods")
	onMods(mods: ModManager) {
		mods.mods.forEach((mod: Mod) => {
			var parent = document.getElementById("mods");
			if (parent !== null && parent !== undefined) {
				var entry = document.createElement('div');
				var chk = document.createElement("input");
				chk.id = mod.meta.name;
				entry.appendChild(chk);
				var icon = document.createElement('img');
				icon.src = "data:image/png;base64, " + mod.icon;
				icon.width = 30;
				icon.height = 30;
				entry.appendChild(icon);
				var text = document.createElement("span");
				text.textContent = mod.meta.name + " " + mod.meta.version;
				entry.appendChild(text);
				parent.appendChild(entry);
				//@ts-ignore
				$('#' + mod.meta.name).checkbox({
					checked: true
				});
			}
		});
		mods.patches.forEach((patch: Patch) => {
			var parent = document.getElementById("mods");
			if (parent !== null && parent !== undefined) {
				var entry = document.createElement('div');
				var chk = document.createElement("input");
				chk.id = patch.meta.name;
				entry.appendChild(chk);
				var icon = document.createElement('img');
				icon.src = "./flips.png";
				icon.width = 30;
				icon.height = 30;
				entry.appendChild(icon);
				var text = document.createElement("span");
				text.textContent = patch.meta.name;
				entry.appendChild(text);
				parent.appendChild(entry);
				//@ts-ignore
				$('#' + patch.meta.name).checkbox({
					checked: true
				});
			}
		});
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
