const servers = [];

function createServerEntry(name, url, port){
	servers.push({name: name, url: url, port: port});
}

createServerEntry("Official Ooto Server", "192.99.70.23", "8000");

module.exports = servers;
