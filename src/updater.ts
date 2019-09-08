import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export class GUIUpdater_child {
  doUpdate() {
    let filelock = true;
    while (filelock) {
      try {
        fs.renameSync('./resources/app.asar', './resources/app.asar');
      } catch (err) {
        if (err) {
          filelock = true;
          continue;
        }
      }
      filelock = false;
    }
    if (fs.existsSync('./update.asar.dummy')) {
      fs.copyFileSync('./update.asar.dummy', './resources/app.asar');
      fs.unlinkSync('./update.asar.dummy');
      let child = spawn('./modloader64 gui.exe', [], { detached: true });
      child.unref();
    }
  }
}

let c: GUIUpdater_child = new GUIUpdater_child();
c.doUpdate();
