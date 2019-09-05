const ncp = require('ncp');

ncp("./src", "./app", function (err) {
	if (err) {
		return console.error(err);
	}
	console.log('done!');
});

ncp("./resources", "./app", function (err) {
	if (err) {
		return console.error(err);
	}
	console.log('done!');
});

