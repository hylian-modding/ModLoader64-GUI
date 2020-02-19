import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class Rom {
  filename: string;
  hash: string;

  constructor(filename: string) {
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

  getRoms() {
    let romsDir: string = path.resolve(path.join('.', 'ModLoader', 'roms'));
    if (fs.existsSync(romsDir)) {
      fs.readdirSync(romsDir).forEach((file: string) => {
        let p: string = path.join(romsDir, file);
        let parse = path.parse(p);
        if (parse.ext === '.n64' || parse.ext === '.z64' || parse.ext === ".v64" || parse.ext === ".zip") {
          let rom: Rom = new Rom(p);
          this.roms.push(rom);
        }
      });
    }
  }
}
