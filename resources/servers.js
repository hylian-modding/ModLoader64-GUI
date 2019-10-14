const servers = [];

function createServerEntry(name, url, port){
	servers.push({name: name, url: url, port: port});
}

createServerEntry("Official Ooto Server", "192.99.70.23", "8000");
createServerEntry("Official BKO Server", "192.99.70.23", "8010");
createServerEntry("Official BKT Server", "192.99.70.23", "8015");
createServerEntry("Official SM64O Server", "192.99.70.23", "8020");

module.exports = servers;
