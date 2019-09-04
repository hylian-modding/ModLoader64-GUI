import { EventEmitter2 } from 'eventemitter2';

export class MessageLayer {

	private emitter: any;
	private retriever: any;
	private emitKey: string;
	private backingEmitter: EventEmitter2 = new EventEmitter2();

	constructor(emitter: any, retriever: any, emitKey: string) {
		this.emitter = emitter;
		this.retriever = retriever;
		this.emitKey = emitKey;
	}

	emit(key: string, evt: any) {
		this.emitter[this.emitKey](key, evt);
	}

	setupMessageProcessor(instance: any) {
		let p = Object.getPrototypeOf(instance);
		if (p.hasOwnProperty('ModLoader')) {
			if (p.ModLoader.hasOwnProperty('MessageProcessor')) {
				if (
					p.ModLoader.MessageProcessor.hasOwnProperty('MessageHandlers') !== null
				) {
					((inst: MessageLayer) => {
						p.ModLoader.MessageProcessor.MessageHandlers.forEach(function (
							value: string,
							key: string
						) {
							let a = (instance as any)[value].bind(instance);
							inst.backingEmitter.on(key, a);
							inst.retriever.on(key, (evtKey: string, evt: any) => {
								inst.backingEmitter.emit(key, evt);
							});
						});
					})(this);
				}
			}
		}
	}
}

export function MessageProcessor(key: string) {
	return function (
		target: any,
		propertyKey: string,
		descriptor: PropertyDescriptor
	) {
		if (target.ModLoader === undefined) {
			target['ModLoader'] = {};
		}
		if (target.ModLoader.MessageProcessor === undefined) {
			target.ModLoader['MessageProcessor'] = {};
		}
		if (target.ModLoader.MessageProcessor.MessageHandlers === undefined) {
			target.ModLoader.MessageProcessor['MessageHandlers'] = new Map<
				string,
				Function
			>();
		}
		target.ModLoader.MessageProcessor.MessageHandlers.set(key, propertyKey);
	};
}
