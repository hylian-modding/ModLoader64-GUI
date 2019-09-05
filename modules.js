const copyNodeModules = require('copy-node-modules');
const exec = require('child_process').execSync;

const srcDir = '.';
const dstDir = './app';
copyNodeModules(srcDir, dstDir, { devDependencies: false }, (err, results) => {
	if (err) {
		console.error(err);
		return;
	}
	exec("asar pack ./app ./dist/win-ia32-unpacked/resources/app.asar");
});
