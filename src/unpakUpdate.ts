import { Pak } from './PakFormat';
import fs from 'fs';
import path from 'path';
import request from 'request';
const download = require('download-file');

request(
  'https://nexus.inpureprojects.info/ModLoader64/update/update.json',
  (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const fbResponse = JSON.parse(body);
      console.log('Got a response: ', fbResponse);
      let version = 'Nothing';
      if (fs.existsSync('./update.json')) {
        version = JSON.parse(fs.readFileSync('./update.json').toString())
          .version;
      }
      let options = {
        directory: './',
        filename: 'ModLoader.pak',
      };
      if (version !== fbResponse.version) {
        fs.writeFileSync('./update.json', JSON.stringify(fbResponse));
        download(
          'https://nexus.inpureprojects.info/ModLoader64/update/ModLoader.pak',
          options,
          function(err: any) {
            if (err) throw err;
            if (fs.existsSync('./ModLoader.pak')) {
              let pak: Pak = new Pak('./ModLoader.pak');
              pak.extractAll('./');
              fs.unlinkSync('./ModLoader.pak');
              process.exit(1852400485);
            }
            process.exit(0);
          }
        );
      }
      // Check plugins.
      if (fs.existsSync('./ModLoader/mods')) {
        fs.readdirSync('./ModLoader/mods').forEach((file: string) => {
          let parse = path.parse(file);
          if (parse.ext === '.pak') {
            console.log('Found .pak file: ' + parse.base + '.');
            let modPak: Pak = new Pak(
              path.join('./ModLoader/mods', parse.base)
            );
            for (let i = 0; i < modPak.pak.header.files.length; i++) {
              if (
                modPak.pak.header.files[i].filename.indexOf('package.json') > -1
              ) {
                let meta: any = JSON.parse(modPak.load(i).toString());
                if (meta.hasOwnProperty('updateUrl')) {
                  // Do things.
                } else {
                  console.log('No update entry found.');
                }
                break;
              }
            }
          }
        });
      }
    } else {
      console.log(
        'Got an error: ',
        error,
        ', status code: ',
        response.statusCode
      );
    }
  }
);
