import { Pak } from './PakFormat';
import fs from 'fs';
import path from 'path';
import request from 'request';
const download = require('download-file');

let download_dir: string = "./downloads";
let cores_dir: string = "./ModLoader/cores";
let isDev: boolean = fs.existsSync("./DEV_FLAG.json");

// Check plugins.
let updatedSomething = false;
if (fs.existsSync('./ModLoader/cores')) {
  fs.readdirSync('./ModLoader/cores').forEach((file: string) => {
    let parse = path.parse(file);
    if (parse.ext === '.pak') {
      console.log('Found .pak file: ' + parse.base + '.');
      let modPak: Pak = new Pak(path.join('./ModLoader/cores', parse.base));
      if (modPak.verify()){
				for (let i = 0; i < modPak.pak.header.files.length; i++) {
					if (modPak.pak.header.files[i].filename.indexOf('package.json') > -1) {
						let meta: any = JSON.parse(modPak.load(i).toString());
						if (meta.hasOwnProperty('updateUrl')) {
							let updateurl: string = meta.updateUrl;
							if (isDev && meta.hasOwnProperty("devUrl")) {
								updateurl = meta.devUrl;
							}
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
										download(resp.url, options, function(err: any) {
											if (err) throw err;
											let pak: Pak = new Pak(path.join(download_dir, parse.base));
											if (pak.verify()){
												console.log("Pak file verified.");
												fs.copyFileSync(path.join(download_dir, parse.base), path.join(cores_dir, parse.base));
												fs.unlinkSync(path.join(download_dir, parse.base));
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
				fs.unlinkSync(path.join('./ModLoader/cores', parse.base));
			}
    }
  });
}
