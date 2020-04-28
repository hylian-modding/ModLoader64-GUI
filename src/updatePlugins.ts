import { Pak } from './PakFormat';
import fs from 'fs';
import path from 'path';
import request from 'request';
const download = require('download-file');
let url = require('url');

// Check plugins.
let updatedSomething = false;
if (fs.existsSync('./ModLoader/mods')) {
	let download_dir: string = "./downloads";
	let cores_dir: string = "./ModLoader/cores";
	let mods_dir: string = "./ModLoader/mods";
	if (!fs.existsSync(download_dir)) {
		fs.mkdirSync(download_dir);
	}
	fs.readdirSync('./ModLoader/mods').forEach((file: string) => {
		let parse = path.parse(file);
		if (parse.ext === '.pak') {
			console.log('Found .pak file: ' + parse.base + '.');
			let modPak: Pak = new Pak(path.join('./ModLoader/mods', parse.base));
			if (modPak.verify()) {
				for (let i = 0; i < modPak.pak.header.files.length; i++) {
					if (modPak.pak.header.files[i].filename.indexOf('package.json') > -1) {
						let meta: any = JSON.parse(modPak.load(i).toString());
						if (meta.hasOwnProperty('modloader64_deps')) {
							Object.keys(meta['modloader64_deps']).forEach((key: string) => {
								console.log(meta.name + ' requires ' + key + '.');
								if (
									!fs.existsSync(path.join('./ModLoader/cores', key + '.pak'))
								) {
									let repo: string = meta['modloader64_deps'][key];
									repo =
										repo.replace(
											'https://github.com',
											'https://raw.githubusercontent.com'
										) + '/master/update.json';
									request(repo, (error: any, response: any, body: any) => {
										if (!error && response.statusCode === 200) {
											let resp: any = JSON.parse(body);
											let options = {
												directory: download_dir,
												filename: path.basename(url.parse(resp.url).pathname),
											};
											download(resp.url, options, function (err: any) {
												if (err) throw err;
												let pak: Pak = new Pak(path.join(download_dir, path.basename(url.parse(resp.url).pathname)));
												if (pak.verify()) {
													console.log("Pak file verified.");
													fs.copyFileSync(path.join(download_dir, path.basename(url.parse(resp.url).pathname)), path.join(cores_dir, path.basename(url.parse(resp.url).pathname)));
													fs.unlinkSync(path.join(download_dir, path.basename(url.parse(resp.url).pathname)));
												}
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
											directory: download_dir,
											filename: parse.base,
										};
										download(resp.url, options, function (err: any) {
											if (err) throw err;
											let pak: Pak = new Pak(path.join(download_dir, path.basename(url.parse(resp.url).pathname)));
											if (pak.verify()) {
												console.log("Pak file verified.");
												fs.copyFileSync(path.join(download_dir, path.basename(url.parse(resp.url).pathname)), path.join(mods_dir, path.basename(url.parse(resp.url).pathname)));
												fs.unlinkSync(path.join(download_dir, path.basename(url.parse(resp.url).pathname)));
											}
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
			}else{
				fs.unlinkSync(path.join('./ModLoader/mods', parse.base));
			}
		}
	});
}
