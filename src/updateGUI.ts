import { Pak } from './PakFormat';
import fs from 'fs';
const download = require('download-file');

export class GUIUpdater {
	doCheck() {
		if (fs.existsSync('./app.pak')) {
			let pak: Pak = new Pak('./app.pak');
			if (pak.verify()) {
				pak.extractAll('./resources');
				fs.unlinkSync('./app.pak');
			}
			process.exit(1852400485);
		}
		if (fs.existsSync('readme.md')) {
			return;
		}
		let pkg: any = JSON.parse(
			fs.readFileSync(__dirname + '/package.json').toString()
		);
		(async () => {
			const fetch = require('node-fetch');
			const response = await fetch('https://repo.modloader64.com/launcher/update/update.json');
			const body = await response.arrayBuffer();
			const buf = Buffer.from(body);
			const j = JSON.parse(buf.toString());
			if (j.version !== pkg.version) {
				let options = {
					directory: './',
					filename: 'app.pak',
				};
				console.log("Trying to download...");
				download(j.url, options, function (err: any) {
					if (err) throw err;
					if (fs.existsSync('./app.pak')) {
						let pak: Pak = new Pak('./app.pak');
						if (pak.verify()) {
							pak.extractAll('./resources');
							fs.unlinkSync('./app.pak');
						}
						process.exit(1852400485);
					}
				});
			} else {
				process.exit(0);
			}
		})();
	}
}

const update: GUIUpdater = new GUIUpdater();
update.doCheck();
