import { Pak } from './PakFormat';
import fs from 'fs';
import path from 'path';
import request from 'request';
const download = require('download-file');

// Check plugins.
let updatedSomething = false;
if (fs.existsSync('./ModLoader/cores')) {
  fs.readdirSync('./ModLoader/cores').forEach((file: string) => {
    let parse = path.parse(file);
    if (parse.ext === '.pak') {
      console.log('Found .pak file: ' + parse.base + '.');
      let modPak: Pak = new Pak(path.join('./ModLoader/cores', parse.base));
      for (let i = 0; i < modPak.pak.header.files.length; i++) {
        if (modPak.pak.header.files[i].filename.indexOf('package.json') > -1) {
          let meta: any = JSON.parse(modPak.load(i).toString());
          if (meta.hasOwnProperty('updateUrl')) {
            request(meta.updateUrl, (error: any, response: any, body: any) => {
              if (!error && response.statusCode === 200) {
                const resp: any = JSON.parse(body);
                let pversion: any = meta.version;
                if (pversion !== resp.version) {
                  console.log('Updating ' + meta.name + '...');
                  console.log(resp);
                  let options = {
                    directory: './ModLoader/cores',
                    filename: parse.base,
                  };
                  download(resp.url, options, function(err: any) {
                    if (err) throw err;
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
    }
  });
}
