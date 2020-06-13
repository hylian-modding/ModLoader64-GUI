import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class Rom {
  filename: string;
	hash: string;
	parentfolder: string;
	subfolder: string;

  constructor(filename: string, parentfolder = "ModLoader", subfolder = "Roms") {
		this.subfolder = subfolder;
		this.parentfolder = parentfolder;
    this.filename = filename;
    this.hash = crypto
      .createHash('md5')
      .update(fs.readFileSync(filename))
      .digest('hex');
    this.filename = path.parse(this.filename).base;
  }
}

export class RomManager {
  roms: Rom[] = new Array<Rom>();

	private _recursiveCall(parent: string, child: string){
		let romsDir: string = path.resolve(path.join(parent, child));
    if (fs.existsSync(romsDir)) {
      fs.readdirSync(romsDir).forEach((file: string) => {
				let p: string = path.join(romsDir, file);
				if (fs.lstatSync(p).isDirectory()){
					this._recursiveCall(romsDir, file);
				}else{
					let parse = path.parse(p);
					if (
						parse.ext === '.n64' ||
						parse.ext === '.z64' ||
						parse.ext === '.v64' ||
						parse.ext === '.zip'
					) {
						let rom: Rom = new Rom(p, path.parse(parent).name, child);
						this.roms.push(rom);
					}
				}
      });
    }
	}

  getRoms() {
		this._recursiveCall(path.join(".", "ModLoader"), "roms");
  }
}
