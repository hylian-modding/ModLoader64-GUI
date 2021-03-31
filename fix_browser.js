/*
	So Electron is weird. ES6 stuff technically works due to Node integration, but exports doesn't exist so it throws a hissy fit.
	This fixes that in a dumb blunt way.
 */

const fs = require('fs');

/* let data = fs.readFileSync("./app/index_renderer.js").toString();
let o = "const exports = {};\n";
o+=data;
fs.writeFileSync("./app/index_renderer.js", o);
 */
