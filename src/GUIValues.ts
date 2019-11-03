export interface IGUIValues {
  nickname: string;
  lobby: string;
  password: string;
  rom: string;
  server: string;
}

export class GUIValues implements IGUIValues {
  nickname: string;
  lobby: string;
  password: string;
  rom: string;
  server: string;

  constructor(
    nickname: string,
    lobby: string,
    password: string,
    rom: string,
    server: string
  ) {
    this.nickname = nickname;
    this.lobby = lobby;
    this.password = password;
    this.rom = rom;
    this.server = server;
  }
}
