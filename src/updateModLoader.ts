import { Pak } from './PakFormat';
import fs from 'fs';
import path from 'path';
import request from 'request';
const download = require('download-file');
import fse from 'fs-extra';

let isDev: boolean = fs.existsSync("./DEV_FLAG.json");

let updateURL: string = "https://repo.modloader64.com/update/update.json";

if (isDev){
	updateURL = "https://repo.modloader64.com/dev/update.json";
}

(async () => {
	const fetch = require('node-fetch');
	const response = await fetch(updateURL);
	const body = await response.arrayBuffer();
	const buf = Buffer.from(body);
	const j = JSON.parse(buf.toString());
	if (fs.existsSync('./ModLoader.pak')) {
		fse.removeSync('./ModLoader/src');
		let pak: Pak = new Pak('./ModLoader.pak');
		pak.extractAll('./');
		fs.unlinkSync('./ModLoader.pak');
		process.exit(1852400485);
	}
	console.log('Got a response: ', j);
	let version = 'Nothing';
	console.log(path.resolve('./update.json'));
	let data: any = {};
	if (fs.existsSync('./update.json')) {
		data = JSON.parse(fs.readFileSync('./update.json').toString());
		version = data.version;
	}
	let options = {
		directory: './',
		filename: 'ModLoader.pak',
	};
	let platformkey = '';
	if (process.env.PROCESSOR_ARCHITECTURE === undefined) {
		platformkey = process.platform.trim() + 'x64';
	} else {
		platformkey =
			process.platform.trim() + process.env.PROCESSOR_ARCHITECTURE;
	}
	if (platformkey === "win32AMD64"){
		platformkey = "win32x64";
	}
	console.log(platformkey);
	if (version !== j.version) {
		fs.writeFileSync('./update.json', JSON.stringify(j));
		data = JSON.parse(fs.readFileSync('./update.json').toString());
		download(data[platformkey], options, function (err: any) {
			if (err) throw err;
			if (fs.existsSync('./ModLoader.pak')) {
				fse.removeSync('./ModLoader/src');
				let pak: Pak = new Pak('./ModLoader.pak');
				if (pak.verify()) {
					//@ts-ignore
					let cfg: Buffer = undefined;
					if (fs.existsSync("./ModLoader/emulator/mupen64plus.cfg")){
						cfg = fs.readFileSync("./ModLoader/emulator/mupen64plus.cfg");
					}
					pak.extractAll('./');
					fs.unlinkSync('./ModLoader.pak');
					if (cfg !== undefined){
						fs.writeFileSync("./ModLoader/emulator/mupen64plus.cfg", cfg);
					}
				}else{
					fs.unlinkSync("./update.json");
					fs.unlinkSync("./ModLoader.pak");
					process.exit(1);
				}
			}
		});
	}
})();
