export interface IGUIValues {
  nickname: string;
  lobby: string;
  password: string;
}

export class GUIValues implements IGUIValues {
  nickname: string;
  lobby: string;
  password: string;

  constructor(nickname: string, lobby: string, password: string) {
    this.nickname = nickname;
    this.lobby = lobby;
    this.password = password;
  }
}
