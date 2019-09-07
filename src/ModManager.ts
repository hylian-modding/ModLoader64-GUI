import fs from 'fs';
import path from 'path';
import { Pak } from './PakFormat';

export class Mod {
	file: string;
	meta?: any;
	icon?: string;

	constructor(file: string) {
		this.file = file;
	}
}

export class Patch{
	file: string;
	meta?: any;

	constructor(file: string){
		this.file = file;
	}
}

export class ModManager {

	mods: Array<Mod> = new Array<Mod>();
	patches: Array<Patch> = new Array<Patch>();

	scanMods() {
		let paks: Array<Pak> = new Array<Pak>();
		if (fs.existsSync("./ModLoader/mods")) {
			fs.readdirSync("./ModLoader/mods").forEach((file: string) => {
				let parse = path.parse(file);
				if (parse.ext === ".pak") {
					let modPak: Pak = new Pak(path.join("./ModLoader/mods", parse.base));
					paks.push(modPak);
				}else if (parse.ext === ".bps"){
					let patch = new Patch(path.join("./ModLoader/mods", parse.base));
					patch.meta = {name: parse.name, version: "???"};
					this.patches.push(patch);
				}
			});
		}
		paks.forEach((modPak: Pak)=>{
			let mod = new Mod(modPak.fileName);
			this.mods.push(mod);
			for (let i = 0; i < modPak.pak.header.files.length; i++) {
				if (modPak.pak.header.files[i].filename.indexOf("package.json") > -1) {
					let meta: any = modPak.load(i);
					mod.meta = meta;
					break;
				}
			}
			for (let i = 0; i < modPak.pak.header.files.length; i++) {
				if (modPak.pak.header.files[i].filename.indexOf("icon.png") > -1) {
					let icon: Buffer = modPak.load(i);
					mod.icon = icon.toString('base64');
					break;
				}
			}
		});
	}
}
