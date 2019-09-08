import fs from 'fs';
import path from 'path';
import { Pak } from './PakFormat';

export class Mod {
  file: string;
  meta?: any;
  icon?: string;

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

  scanMods() {
    let paks: Pak[] = new Array<Pak>();
    if (fs.existsSync('./ModLoader/mods')) {
      fs.readdirSync('./ModLoader/mods').forEach((file: string) => {
        let parse = path.parse(file);
        if (parse.ext === '.pak' || parse.base.indexOf('.pak.disabled') > -1) {
          let modPak: Pak = new Pak(path.join('./ModLoader/mods', parse.base));
          paks.push(modPak);
        } else if (
          parse.ext === '.bps' ||
          parse.base.indexOf('.bps.disabled') > -1
        ) {
          let patch = new Mod(path.join('./ModLoader/mods', parse.base));
          let icon = '';
          if (fs.existsSync('./flips.png')) {
            icon = fs.readFileSync('./flips.png').toString('base64');
          } else {
            icon = fs.readFileSync('./resources/flips.png').toString('base64');
          }
          patch.meta = {
            name: file.replace('.bps', '').replace('.disabled', ''),
            version: '',
          };
          patch.icon = icon;
          this.mods.push(patch);
        }
      });
    }
    paks.forEach((modPak: Pak) => {
      let mod = new Mod(modPak.fileName);
      this.mods.push(mod);
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
          break;
        }
      }
    });
  }
}
