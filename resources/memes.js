let d = 0;
let icache = [];
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
	"Getting the source code",
	"Releasing Modloader before 2030",
	"Making models but not releasing them",
	"Getting SRM from bomb replication",
	"Wasting memory",
	"Crashing because someone walked into your scene",
	"Turning Zelda into a chest",
	"Working on Wind Waker Online"
	"Exploding Psi's 200 IQ brain"
];

function randomShitpost() {
	var thisRand;
	var free = [];
	let i = 0;
	for (i = 0; i < loading.length; i++) {
		if (!icache[i]) {
			free.push(i);
		}
	}

	thisRand = free[Math.floor(Math.random() * free.length)];

	icache[thisRand] = true;

	var item = loading[thisRand];
	if (item === "" || item === undefined || item === null){
		icache.splice(0, icache.length);
		item = "Uncaching the memes";
	}
	document.getElementById("meme").textContent = item;
}

randomShitpost();

var dot = ".";

setInterval(() => {
	let dots = "";
	if (d > 3) {
		d = 0;
		randomShitpost();
	}
	for (let i = 0; i < d; i++) {
		dots += dot;
	}
	d++;
	document.getElementById("dots").textContent = dots;
}, 400);
