// Copy this decorator from ModLoader's API so its the same on both sides.

export class GUITunnelPacket {
  id: string;
  event: string | string[];
  data: any;

  constructor(id: string, event: string | string[], data: any) {
    this.id = id;
    this.event = event;
    this.data = data;
  }
}

export function TunnelMessageHandler(key: string) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    if (target.ModLoader === undefined) {
      target['ModLoader'] = {};
    }
    if (target.ModLoader.TunnelMessageHandler === undefined) {
      target.ModLoader['TunnelMessageHandler'] = {};
    }
    if (target.ModLoader.TunnelMessageHandler.MessageHandlers === undefined) {
      target.ModLoader.TunnelMessageHandler['MessageHandlers'] = new Map<
        string,
        string
      >();
    }
    target.ModLoader.TunnelMessageHandler.MessageHandlers.set(key, propertyKey);
  };
}
