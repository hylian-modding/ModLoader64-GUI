let d = 0;
let icache: Array<number> = [];
var loading = [
	"Making Zelda a girl",
	"Unlocking green Mario",
	"Pushing Melon off a ledge",
	"Calibrating Ganon's cape",
	"Generating questionable shades of purple",
	"Placing excessive bombiwas",
	"Obsessing over rotation codes",
	"Grabbing my stuff",
	"Generating lag",
	"Spawning puppets upside down",
	"Hiding all the bomb bags",
	"BLJing through doors",
	"Chasing Mips",
	"Rescuing Princesses for cake",
	"Debating Sketchup vs Blender",
	"Celebrating ZFG's birthday",
	"Flipping tables",
	"Raising dongers",
	"Spamming PogChamp",
	"Talon trotting up hills",
	"Dropping penguins off the map",
	"Spending Jiggies",
	"Collecting a star",
	"Locating Mario's hat",
	"Asking questions without reading the FAQ",
	"Giving away bombs, but not the bomb bag",
	"Filling inventory with sticks",
	"Sending horses to the glue factory",
	"Shoutouts to SimpleFlips",
	"Wearing gloves while speedrunning",
	"Shouting Guh-huh",
	"Stealing Mido's belongings",
	"Crashing the game thanks to Mido",
	"Hugging Gohma",
	"Dying by a slowly falling block",
	"Bringing back faphand",
	"Adding PvP to OOT",
	"Replicating damage to myself endlessly",
	"Having the highest MMR in OOT Rando",
	"Lurking in dev VC but not working on Modloader",
	"Adding Quake physics",
	"Grog punch goblin",
	"Slaying enemies with ball bearings",
	"Torching the manor",
	"\"It works on my system\"",
	"Getting the source code",
	"Releasing Modloader before 2030",
	"Making models but not releasing them",
	"Online support for Wrestlemania 2000 when",
	"Getting SRM from bomb replication",
	"Wasting memory",
	"Crashing because someone walked into your scene",
	"Punching things to tame them",
	"Breeding dinos instead of coding"
];

function randomShitpost() {
	var thisRand = Math.floor(Math.random() * loading.length);
	var found = false;
	while (found) {
		thisRand = Math.floor(Math.random() * loading.length);
		icache.forEach(function(v) {
			if (v == thisRand) found = true;
		});
	}
	
	icache.push(thisRand)
	
	var item = loading[];
	document.getElementById("meme").textContent = item;
}

randomShitpost();

setInterval(() => {
	let dots = "";
	if (d > 3) {
		d = 0;
		randomShitpost();
	}
	for (let i = 0; i < d; i++) {
		dots += ".";
	}
	d++;
	document.getElementById("dots").textContent = dots;
}, 500);
