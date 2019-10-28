const servers = [];

function createServerEntry(name, url, port){
	servers.push({name: name, url: url, port: port});
}

createServerEntry("Official Ooto Server", "192.99.70.23", "8000");
createServerEntry("Official BKO Server", "192.99.70.23", "8010");
createServerEntry("Official BKT Server", "192.99.70.23", "8015");
createServerEntry("Official SM64O Server", "192.99.70.23", "8020");
createServerEntry("Official DK64O Server", "192.99.70.23", "8025");
createServerEntry("Official MMO Server", "192.99.70.23", "8030");

module.exports = servers;
