import { Pak } from './PakFormat';
import fs from 'fs';
import path from 'path';
import request from 'request';
const download = require('download-file');
import { spawn } from 'child_process';
import { app } from 'electron';

export class GUIUpdater {
  doCheck() {
    if (fs.existsSync('readme.md')) {
      return;
    }
    let pkg: any = JSON.parse(
      fs.readFileSync(__dirname + '/package.json').toString()
    );
    request(
      'https://nexus.inpureprojects.info/ModLoader64/launcher/update/update.json',
      (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const fbResponse = JSON.parse(body);
          if (fbResponse.version !== pkg.version) {
            let options = {
              directory: './',
              filename: 'update.asar.dummy',
            };
            download(
              'https://nexus.inpureprojects.info/ModLoader64/launcher/update/app.asar',
              options,
              function(err: any) {
                if (err) throw err;
                let child = spawn('./node.exe', ['./updater.js'], {
                  detached: true,
                });
                child.unref();
                app.exit();
              }
            );
          }
        }
      }
    );
  }
}
