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
	"Wearing gloves while speedrunning"
];

function randomShitpost() {
	var item = loading[Math.floor(Math.random() * loading.length)];
	document.getElementById("meme").textContent = item;
}

randomShitpost();

let d = 0;

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
