export class ModLoader64GUIConfig{
	showAdvancedTab: boolean = false;
	automaticUpdates: boolean = true;

	constructor(){
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
