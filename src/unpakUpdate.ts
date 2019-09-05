import { Pak } from './PakFormat';
import fs from 'fs';

if (fs.existsSync("./ModLoader.pak")) {
	let pak: Pak = new Pak("./ModLoader.pak");
	pak.extractAll("./");
	fs.unlinkSync("./ModLoader.pak");
	process.exit(1);
}

process.exit(0);
