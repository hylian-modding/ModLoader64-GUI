import { Pak } from './PakFormat';
import fs from 'fs';
import path from 'path';
import request from 'request';
const download = require('download-file');
import { fork } from 'child_process';

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
        if (error) {
          fs.writeFileSync('./' + 'updateerror.log', error.toString());
        }
        if (response.statusCode) {
          fs.writeFileSync(
            './' + 'update_response.log',
            response.statusCode.toString()
          );
        }
        if (!error && response.statusCode === 200) {
          const fbResponse = JSON.parse(body);
          if (fbResponse.version !== pkg.version) {
            let options = {
              directory: './',
              filename: 'app.pak',
            };
            download(fbResponse.url, options, function(err: any) {
              if (err) throw err;
              if (fs.existsSync('./app.pak')) {
                let pak: Pak = new Pak('./app.pak');
                pak.extractAll('./resources');
                fs.unlinkSync('./app.pak');
                process.exit(1852400485);
              }
            });
          } else {
            process.exit(0);
          }
        }
      }
    );
  }
}

const update: GUIUpdater = new GUIUpdater();
update.doCheck();
