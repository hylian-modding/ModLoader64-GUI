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
	showAdvancedTab: boolean = false;

	constructor(){
		this.keybindings = new KeyBinds();
	}

	fromFile(obj: any){
		Object.keys(this).forEach((key: string)=>{
			if (obj.hasOwnProperty(key)){
				(this as any)[key] = obj[key];
			}
		});
		return this;
	}
}
