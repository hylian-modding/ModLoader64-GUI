import { MessageLayer } from './MessageLayer';
import { TunnelMessageHandler } from './GUITunnel';
import { ipcRenderer } from 'electron';
import unhandled from 'electron-unhandled';

unhandled();

const hooks = { print: (msg: string) => {}, exit: ()=>{} };

class WebSideMessageHandlers {
  layer: MessageLayer;

  constructor(emitter: any, retriever: any) {
    this.layer = new MessageLayer('internal_event_bus', emitter, retriever);
    this.layer.setupMessageProcessor(this);
  }

  @TunnelMessageHandler('onLog')
  onLog(evt: any) {
    hooks.print(evt);
	}
}

const handlers = new WebSideMessageHandlers(ipcRenderer, ipcRenderer);

let Convert = require('ansi-to-html');
let convert = new Convert({
  newline: true,
});

function print(msg: string) {
  let log: HTMLElement = document.getElementById('log-container')!;

  log.innerHTML += convert.toHtml(msg);
  log.scrollTop = log.scrollHeight - log.clientHeight;
}

hooks.print = print;

hooks.exit = ()=>{
	handlers.layer.send("forceExit", {});
};

module.exports = hooks;
