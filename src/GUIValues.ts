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

  constructor(nickname: string, lobby: string, password: string, rom: string) {
    this.nickname = nickname;
    this.lobby = lobby;
    this.password = password;
    this.rom = rom;
  }
}
