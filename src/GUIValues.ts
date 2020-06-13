export interface IGUIValues {
  nickname: string;
  lobby: string;
  password: string;
  rom: string;
}

export class GUIValues implements IGUIValues {
  nickname: string;
  lobby: string;
  password: string;
  rom: string;
	isOffline: boolean;
	serverIP: string;
	serverPort: string;
	selfhost: boolean;
	alternateConnection: boolean;

  constructor(
    nickname: string,
    lobby: string,
    password: string,
		rom: string,
		isOffline: boolean,
		serverIP: string,
		serverPort: string,
		selfhost: boolean,
		alternateConnection: boolean
  ) {
    this.nickname = nickname;
    this.lobby = lobby;
    this.password = password;
		this.rom = rom;
		this.isOffline = isOffline;
		this.serverIP = serverIP;
		this.serverPort = serverPort;
		this.selfhost = selfhost;
		this.alternateConnection = alternateConnection;
  }
}
