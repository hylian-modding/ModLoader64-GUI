export class KeyBind{
	key: string;

	constructor(key: string){
		this.key = key;
	}
}

export class KeyBinds{
	soft_reset: KeyBind;

	constructor(){
		this.soft_reset = new KeyBind("F9");
	}
}

export class ModLoader64GUIConfig{
	keybindings: KeyBinds;

	constructor(){
		this.keybindings = new KeyBinds();
	}
}
