import fs from 'fs';
import path from 'path';
import { Pak } from './PakFormat';
import crypto from 'crypto';

export class Mod {
  file: string;
  meta?: any;
  icon?: string;
  type?: string;
	category?: string;
	hash?: string;

  constructor(file: string) {
    this.file = file;
  }
}

export class ModStatus extends Mod {
  enabled = true;

  constructor(mod: Mod) {
    super(mod.file);
    this.fromMod(mod);
  }

  fromMod(mod: Mod) {
    this.file = mod.file;
    this.meta = mod.meta;
    this.icon = mod.icon;
  }
}

export class ModManager {
  mods: Mod[] = new Array<Mod>();

  changeStatus(mod: ModStatus) {
    let m: Mod | undefined = undefined;
    for (let i = 0; i < this.mods.length; i++) {
      if (this.mods[i].meta.name === mod.meta.name) {
        m = this.mods[i];
        break;
      }
    }
    if (m === null || m === undefined) {
      return;
    }
    if (!fs.existsSync(m.file) || m.file === '') {
      return;
    }
    if (mod.enabled) {
      if (m.file.indexOf('.disabled') > -1) {
        fs.renameSync(m.file, m.file.replace('.disabled', ''));
        m.file = m.file.replace('.disabled', '');
      }
    } else {
      if (m.file.indexOf('.disabled') === -1) {
        fs.renameSync(m.file, m.file + '.disabled');
        m.file = m.file + '.disabled';
      }
    }
  }

  scanMods(dir: string, type: string) {
    let paks: Pak[] = new Array<Pak>();
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach((file: string) => {
        let parse = path.parse(file);
        if (parse.ext === '.pak' || parse.base.indexOf('.pak.disabled') > -1) {
					let modPak: Pak = new Pak(path.join(dir, parse.base));
					if (modPak.verify()){
						paks.push(modPak);
					}else{
						console.log("THIS PAK (" + file + ") is corrupt!");
					}
        } else if (
          parse.ext === '.bps' ||
          parse.base.indexOf('.bps.disabled') > -1
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
          this.mods.push(patch);
        }
      });
    }
    paks.forEach((modPak: Pak) => {
      let mod = new Mod(modPak.fileName);
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
      mod.category = type;
      if (mod.meta.hasOwnProperty("isBPS")){
        if (mod.meta.isBPS){
          mod.category = "_patches";
        }
			}
			mod.hash = crypto.createHash('md5').update(fs.readFileSync(mod.file)).digest('hex');
      this.mods.push(mod);
    });
  }
}
