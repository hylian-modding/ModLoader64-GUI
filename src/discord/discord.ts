import DiscordRPC, { Presence } from 'discord-rpc';
import zlib from 'zlib';

const clientId = '639491567815622657';

export class DiscordPresence implements Presence {
	state?: string;
	details?: string;
	startTimestamp?: number;
	endTimestamp?: number;
	largeImageKey?: string;
	largeImageText?: string;
	smallImageKey?: string;
	smallImageText?: string;
	instance?: boolean;
	partySize?: number;
	partyMax?: number;
	matchSecret?: string;
	spectateSecret?: string;
	joinSecret?: string;

	constructor(state?: string,
		details?: string,
		startTimestamp?: number,
		endTimestamp?: number,
		largeImageKey?: string,
		largeImageText?: string,
		smallImageKey?: string,
		smallImageText?: string,
		instance?: boolean,
		partySize?: number,
		partyMax?: number,
		matchSecret?: string,
		spectateSecret?: string,
		joinSecret?: string) {
		this.state = state;
		this.details = details;
		this.startTimestamp = startTimestamp;
		this.endTimestamp = endTimestamp;
		this.largeImageKey = largeImageKey;
		this.largeImageText = largeImageText;
		this.smallImageKey = smallImageKey;
		this.smallImageText = smallImageText;
		this.instance = instance;
		this.partySize = partySize;
		this.partyMax = partyMax;
		this.matchSecret = matchSecret;
		this.spectateSecret = spectateSecret;
		this.joinSecret = joinSecret;
	}
}

export class DiscordIntegration {

	private rpc!: DiscordRPC.Client;
	private presence!: DiscordPresence;
	private ready = false;
	config: any;

	constructor() {
		// only needed for discord allowing spectate, join, ask to join
		try {
			DiscordRPC.register(clientId);
			this.rpc = new DiscordRPC.Client({ transport: 'ipc' });

			this.presence = new DiscordPresence();
			this.presence.details = "On the launcher";
			this.presence.state = "Looking at settings";
			this.presence.startTimestamp = Date.now();
			this.presence.instance = true;
			this.presence.largeImageKey = "ml64";
			this.presence.largeImageText = "ModLoader64";

			this.rpc.on('ready', () => {
				this.rpc.setActivity(this.presence);
				this.ready = true;
				this.rpc.subscribe('GAME_JOIN', (something: any) => {
					console.log(something);
				});
			});

			this.rpc.login({ clientId }).catch(console.error);
		} catch (err) {
		}
	}

	reset() {
		try {
			if (!this.ready) {
				return;
			}
			this.presence = new DiscordPresence();
			this.presence.details = "On the launcher";
			this.presence.state = "Looking at settings";
			this.presence.startTimestamp = Date.now();
			this.presence.instance = false;
			this.presence.largeImageKey = "ml64";
			this.presence.largeImageText = "ModLoader64";
			this.rpc.setActivity(this.presence);
		} catch (err) {

		}
	}

	setActivity(p: any) {
		try {
			if (!this.ready) {
				return;
			}
			this.presence.details = p.details;
			this.presence.state = p.state;
			if (p.hasOwnProperty("smallImageKey")) {
				this.presence.smallImageKey = p.smallImageKey;
			}
			/* 		if (this.config !== undefined){
						let i: string = "";
						console.log(this.config);
						i += zlib.deflateSync(Buffer.from(JSON.stringify(this.config))).toString('base64');
						this.presence.instance = true;
						this.presence.partySize = 1;
						this.presence.partyMax = 10;
						this.presence.joinSecret = i;
						(this.presence as any)["partyId"] = this.config["lobby"];
						this.presence.instance = true;
						console.log(this.presence);
					} */
			this.rpc.setActivity(this.presence);
		} catch (err) {

		}
	}
}
