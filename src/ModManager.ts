import fs from 'fs';
import path from 'path';
import { Pak } from './PakFormat';
import crypto from 'crypto';
import zip, { IZipEntry } from 'adm-zip';

export class Mod {
	file: string;
	subfolder?: string;
	parentfolder?: string;
	meta?: any;
	icon?: string;
	type?: string;
	category?: string;
	hash?: string;

	constructor(file: string) {
		this.file = file;
	}
}

export class ModLoadOrder {
	loadOrder: any = {};
}

export class ModZip {
	zipFile: zip;
	fileName: string;

	constructor(fileName: string, zipFile: zip) {
		this.zipFile = zipFile;
		this.fileName = fileName;
	}
}

export class ModManager {
	mods: Mod[] = new Array<Mod>();
	pakNames: Array<string> = [];
	pakFiles: Array<string> = [];
	folderNames: Array<string> = [];
	loPath: string = "./ModLoader/load_order.json";
	guiDataPath: string = "./user_mod_list.json";
	guiBaseDataPath: string = "./base_mod_list.json";
	guiData!: any;
	baseguiData!: any;
	order: ModLoadOrder = new ModLoadOrder();

	private _recursive(parent: string, child: string, order: ModLoadOrder) {
		let paks: Pak[] = new Array<Pak>();
		let zips: ModZip[] = new Array<ModZip>();
		let dir = path.join(parent, child);
		if (!fs.existsSync(dir)) {
			return;
		}
		fs.readdirSync(dir).forEach((file: string) => {
			if (fs.lstatSync(path.join(dir, file)).isDirectory()) {
				this.folderNames.push(file);
				console.log(file);
				this._recursive(dir, file, order);
			}
			let parse = path.parse(file);
			if (parse.ext === '.pak') {
				let modPak: Pak = new Pak(path.join(dir, parse.base));
				if (modPak.verify()) {
					paks.push(modPak);
				} else {
					console.log("THIS PAK (" + file + ") is corrupt!");
				}
			} else if (
				parse.ext === '.bps'
			) {
				let patch = new Mod(path.join(dir, parse.base));
				patch.category = '_patches';
				let icon = '';
				if (fs.existsSync('./resources/flips.png')) {
					icon = fs.readFileSync('./resources/flips.png').toString('base64');
				} else {
					console.log(path.resolve('./resources/app/flips.png'));
					icon = fs
						.readFileSync('./resources/app/flips.png')
						.toString('base64');
				}
				patch.meta = {
					name: file.replace('.bps', '').replace('.disabled', ''),
					version: '',
				};
				patch.icon = icon;
				patch.hash = crypto.createHash('md5').update(fs.readFileSync(patch.file)).digest('hex');
				patch.parentfolder = path.parse(parent).base;
				patch.subfolder = child;
				this.mods.push(patch);
			} else if (parse.ext === ".zip") {
				zips.push(new ModZip(path.join(dir, parse.base), new zip(path.join(dir, parse.base))));
			}
		});
		paks.forEach((modPak: Pak) => {
			if (!order.loadOrder.hasOwnProperty(modPak.fileName)) {
				order.loadOrder[path.parse(modPak.fileName).base] = false;
			}
			console.log(path.parse(modPak.fileName).base);
			this.pakNames.push(path.parse(modPak.fileName).base);
			let mod = new Mod(modPak.fileName);
			this.pakFiles.push(mod.file);
			for (let i = 0; i < modPak.pak.header.files.length; i++) {
				if (modPak.pak.header.files[i].filename.indexOf('package.json') > -1) {
					let meta: any = JSON.parse(modPak.load(i).toString());
					mod.meta = meta;
					break;
				}
			}
			for (let i = 0; i < modPak.pak.header.files.length; i++) {
				if (modPak.pak.header.files[i].filename.indexOf('icon.png') > -1) {
					let icon: Buffer = modPak.load(i);
					mod.icon = icon.toString('base64');
					mod.type = 'png';
					break;
				} else if (
					modPak.pak.header.files[i].filename.indexOf('icon.gif') > -1
				) {
					let icon: Buffer = modPak.load(i);
					mod.icon = icon.toString('base64');
					mod.type = 'gif';
					break;
				}
			}
			if (mod.meta.hasOwnProperty("isBPS")) {
				if (mod.meta.isBPS) {
					mod.category = "_patches";
				}
			}
			mod.hash = crypto.createHash('md5').update(fs.readFileSync(mod.file)).digest('hex');
			mod.parentfolder = path.parse(parent).base;
			mod.subfolder = child;
			this.mods.push(mod);
		});
		zips.forEach((modPak: ModZip) => {
			if (!order.loadOrder.hasOwnProperty(modPak.fileName)) {
				order.loadOrder[path.parse(modPak.fileName).base] = false;
			}
			console.log(path.parse(modPak.fileName).base);
			this.pakNames.push(path.parse(modPak.fileName).base);
			let mod = new Mod(modPak.fileName);
			this.pakFiles.push(mod.file);
			modPak.zipFile.getEntries().forEach((entry: IZipEntry) => {
				if (mod.meta === undefined && entry.name.indexOf("package.json") > -1) {
					mod.meta = JSON.parse(entry.getData().toString());
				}
			});
			modPak.zipFile.getEntries().forEach((entry: IZipEntry) => {
				if (mod.icon === undefined && entry.name.indexOf("icon.png") > -1) {
					mod.icon = entry.getData().toString('base64');
					mod.type = "png";
				}
				if (mod.icon === undefined && entry.name.indexOf("icon.gif") > -1) {
					mod.icon = entry.getData().toString('base64');
					mod.type = "gif";
				}
			});
			if (mod.meta !== undefined) {
				if (mod.meta.hasOwnProperty("isBPS")) {
					if (mod.meta.isBPS) {
						mod.category = "_patches";
					}
				}
				mod.hash = crypto.createHash('md5').update(fs.readFileSync(mod.file)).digest('hex');
				mod.parentfolder = path.parse(parent).base;
				mod.subfolder = child;
				this.mods.push(mod);
			}
		});
	}

	reinitLoadOrder(): ModLoadOrder {
		this.order = new ModLoadOrder();
		return this.order;
	}

	scanMods(parent: string, child: string) {
		if (fs.existsSync(this.loPath)) {
			console.log("Loading load order from file.");
			this.order = JSON.parse(fs.readFileSync(this.loPath).toString());
		}
		this._recursive(parent, child, this.order);
		if (fs.existsSync(this.guiDataPath)) {
			this.guiData = JSON.parse(fs.readFileSync(this.guiDataPath).toString());
		}
		if (fs.existsSync(this.guiBaseDataPath)) {
			this.baseguiData = JSON.parse(fs.readFileSync(this.guiBaseDataPath).toString());
		}
		Object.keys(this.order.loadOrder).forEach((key: string) => {
			if (this.pakNames.indexOf(key) === -1) {
				delete this.order.loadOrder[key];
			}
		});
		this.saveLoadOrder();
	}

	saveLoadOrder() {
		try {
			fs.writeFileSync(this.loPath, JSON.stringify(this.order, null, 2));
		} catch (error) {
		}
	}
}
