let fse = require('fs-extra');

let p = fse.readJSONSync("./package.json");
delete p["build"];
fse.writeJSONSync("./resources/package.json", p);

fse.copySync("./src", "./app");
fse.copySync("./resources", "./app");
