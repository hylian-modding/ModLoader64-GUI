import { Pak } from './PakFormat';
import fs from 'fs';
import path from 'path';
import request from 'request';
const download = require('download-file');
var url = require("url");

// Check plugins.
let updatedSomething = false;
if (fs.existsSync('./ModLoader/mods')) {
	fs.readdirSync('./ModLoader/mods').forEach((file: string) => {
		let parse = path.parse(file);
		if (parse.ext === '.pak') {
			console.log('Found .pak file: ' + parse.base + '.');
			let modPak: Pak = new Pak(path.join('./ModLoader/mods', parse.base));
			for (let i = 0; i < modPak.pak.header.files.length; i++) {
				if (modPak.pak.header.files[i].filename.indexOf('package.json') > -1) {
					let meta: any = JSON.parse(modPak.load(i).toString());
					if (meta.hasOwnProperty("modloader64_deps")) {
						Object.keys(meta["modloader64_deps"]).forEach((key: string) => {
							console.log(meta.name + " requires " + key + ".");
							if (!fs.existsSync(path.join("./ModLoader/cores", key + ".pak"))) {
								let repo: string = meta["modloader64_deps"][key];
								repo = repo.replace("https://github.com", "https://raw.githubusercontent.com") + "/master/update.json";
								request(repo, (error: any, response: any, body: any) => {
									if (!error && response.statusCode === 200) {
										let resp: any = JSON.parse(body);
										let options = {
											directory: './ModLoader/cores',
											filename: path.basename(url.parse(resp.url).pathname),
										};
										download(resp.url, options, function (err: any) {
											if (err) throw err;
											console.log('Finished updating ' + meta.name + '.');
											updatedSomething = true;
										});
									}
								});
							}
						});
					}
					if (meta.hasOwnProperty('updateUrl')) {
						request(meta.updateUrl, (error: any, response: any, body: any) => {
							if (!error && response.statusCode === 200) {
								const resp: any = JSON.parse(body);
								let pversion: any = meta.version;
								if (pversion !== resp.version) {
									console.log('Updating ' + meta.name + '...');
									console.log(resp);
									let options = {
										directory: './ModLoader/mods',
										filename: parse.base,
									};
									download(resp.url, options, function (err: any) {
										if (err) throw err;
										console.log('Finished updating ' + meta.name + '.');
										updatedSomething = true;
									});
								} else {
									console.log('No update needed: ' + meta.name + '.');
								}
							}
						});
					} else {
						console.log('No update entry found.');
					}
					break;
				}
			}
		}
	});
}
