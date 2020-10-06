import { Pak } from './PakFormat';
import fs from 'fs';
import path from 'path';
import request from 'request';
import AdmZip, { IZipEntry } from 'adm-zip';
const download = require('download-file');
let url = require('url');

let isDev: boolean = fs.existsSync("./DEV_FLAG.json");

function getAllFiles(dirPath: string, arrayOfFiles: Array<string>) {
	let files = fs.readdirSync(dirPath);

	arrayOfFiles = arrayOfFiles || [];

	files.forEach((file) => {
		if (fs.statSync(dirPath + "/" + file).isDirectory()) {
			arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
		}
		else {
			arrayOfFiles.push(path.join(dirPath, "/", file));
		}
	});

	return arrayOfFiles;
}

function runUpdateCheck(m: Buffer, download_dir: string, parse: path.ParsedPath, cores_dir: string, mods_dir: string) {
	let meta: any = JSON.parse(m.toString());
	if (meta.hasOwnProperty('modloader64_deps')) {
		Object.keys(meta['modloader64_deps']).forEach((key: string) => {
			console.log(meta.name + ' requires ' + key + '.');
			if (
				!fs.existsSync(path.join('./ModLoader/cores', key + '.pak'))
			) {
				let repo: string = meta['modloader64_deps'][key];
				repo = repo.replace(".git", "");
				repo = repo.replace('https://github.com', 'https://raw.githubusercontent.com') + '/master/update.json';
				console.log(repo);
				(async () => {
					const fetch = require('node-fetch');
					const response = await fetch(repo);
					const body = await response.arrayBuffer();
					const buf = Buffer.from(body);
					const j = JSON.parse(buf.toString());
					let options = {
						directory: download_dir,
						filename: path.basename(url.parse(j.url).pathname),
					};
					console.log(j.url);
					download(j.url, options, function (err: any) {
						try{
							if (err) throw err;
							let pak: Pak = new Pak(path.join(download_dir, path.basename(url.parse(j.url).pathname)));
							if (pak.verify()) {
								console.log("Pak file verified.");
								fs.copyFileSync(path.join(download_dir, path.basename(url.parse(j.url).pathname)), path.join(cores_dir, path.basename(url.parse(j.url).pathname)));
								fs.unlinkSync(path.join(download_dir, path.basename(url.parse(j.url).pathname)));
							}
							console.log('Finished updating ' + meta.name + '.');
							updatedSomething = true;
						}catch(err){
							console.log(err);
						}
					});
				})();
			}
		});
	}
	if (meta.hasOwnProperty('updateUrl')) {
		let updateurl: string = meta.updateUrl;
		if (isDev && meta.hasOwnProperty("devUrl")) {
			updateurl = meta.devUrl;
		}
		console.log(updateurl);
		console.log(meta);
		(async () => {
			if (updateurl.startsWith("gitrelease:")) {
				console.log("Parsing Github Releases...");
				const fetch = require('node-fetch');
				const response = await fetch(updateurl.replace("gitrelease:", ""));
				const body = await response.arrayBuffer();
				const buf = Buffer.from(body);
				const j = JSON.parse(buf.toString());
				let pversion: any = meta.version;
				let tag = j["tag_name"].replace("v", "");
				let url = j["assets"][0]["browser_download_url"];
				if (pversion !== tag) {
					console.log(url);
					let options = {
						directory: download_dir,
						filename: parse.base,
					};
					download(url, options, function (err: any) {
						try {
							if (err) throw err;
							let p = path.join(download_dir, path.basename(url.parse(j.url).pathname));
							let p2 = path.parse(p);
							if (p2.ext === ".pak") {
								let pak: Pak = new Pak(p);
								if (pak.verify()) {
									console.log("Pak file verified.");
									fs.copyFileSync(p, path.join(mods_dir, path.basename(url.parse(j.url).pathname)));
									fs.unlinkSync(p);
								}
							} else if (p2.ext === ".zip") {
								fs.copyFileSync(p, path.join(mods_dir, path.basename(url.parse(j.url).pathname)));
								fs.unlinkSync(p);
							}
							console.log('Finished updating ' + meta.name + '.');
							updatedSomething = true;
						} catch (err) {
							console.log(err);
						}
					});
				}
			} else {
				const fetch = require('node-fetch');
				const response = await fetch(updateurl);
				const body = await response.arrayBuffer();
				const buf = Buffer.from(body);
				const j = JSON.parse(buf.toString());
				let pversion: any = meta.version;
				if (pversion !== j.version) {
					console.log('Updating ' + meta.name + '...');
					console.log(j);
					let options = {
						directory: download_dir,
						filename: parse.base,
					};
					let download_url = j.url;
					if (isDev && j.hasOwnProperty("devurl")) {
						download_url = j.devurl;
					}
					download(download_url, options, function (err: any) {
						if (err) throw err;
						let p = path.join(download_dir, path.basename(url.parse(j.url).pathname));
						let p2 = path.parse(p);
						if (p2.ext === ".pak") {
							let pak: Pak = new Pak(p);
							if (pak.verify()) {
								console.log("Pak file verified.");
								fs.copyFileSync(p, path.join(mods_dir, path.basename(url.parse(j.url).pathname)));
								fs.unlinkSync(p);
							}else{
								console.log("Pak corrupt!");
							}
						} else if (p2.ext === ".zip") {
							fs.copyFileSync(p, path.join(mods_dir, path.basename(url.parse(j.url).pathname)));
							fs.unlinkSync(p);
						}
						console.log('Finished updating ' + meta.name + '.');
						updatedSomething = true;
					});
				} else {
					console.log('No update needed: ' + meta.name + '.');
				}
			}
		})();
	} else {
		console.log('No update entry found.');
	}
}

// Check plugins.
let updatedSomething = false;
if (fs.existsSync('./ModLoader/mods')) {
	let download_dir: string = "./downloads";
	let cores_dir: string = "./ModLoader/cores";
	let mods_dir: string = "./ModLoader/mods";
	if (!fs.existsSync(download_dir)) {
		fs.mkdirSync(download_dir);
	}
	getAllFiles(mods_dir, []).forEach((file: string) => {
		let parse = path.parse(file);
		if (parse.ext === ".disabled") {
			fs.renameSync(file, path.join(parse.dir, parse.name));
			file = path.join(parse.dir, parse.name);
			parse = path.parse(parse.name);
		}
		if (parse.ext === '.pak') {
			console.log('Found .pak file: ' + parse.base + '.');
			let modPak: Pak = new Pak(file);
			if (modPak.verify()) {
				for (let i = 0; i < modPak.pak.header.files.length; i++) {
					if (modPak.pak.header.files[i].filename.indexOf('package.json') > -1) {
						try{
							runUpdateCheck(modPak.load(i), download_dir, parse, cores_dir, mods_dir);
						}catch(err){
							console.log(err);
							continue;
						}
						break;
					}
				}
			} else {
				fs.unlinkSync(path.join('./ModLoader/mods', parse.base));
			}
		}
		if (parse.ext === ".zip") {
			console.log('Found .zip file: ' + parse.base + '.');
			let modPak: AdmZip = new AdmZip(file);
			modPak.getEntries().forEach((e: IZipEntry) => {
				if (e.name.indexOf('package.json') > -1) {
					try{
						runUpdateCheck(e.getData(), download_dir, parse, cores_dir, mods_dir);
					}catch(err){
						console.log(err);
						return;
					}
				}
			});
		}
	});
}
