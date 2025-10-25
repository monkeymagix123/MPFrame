import { ChatMessage } from "./chat";
import { Player } from "./player";
import { Vec2 } from "./v2";

export interface RoomData {
	roomCode: string;
	players: Player[];
	chatMessages: ChatMessage[];
}

export interface Lobby {
	code: string;
	redCount: number;
	blueCount: number;
}

export interface PlayerData {
	id: string;
	pos: Vec2;
	dashPos: Vec2;

	health: number;
	maxHealth: number;
}

export interface Keys {
	[key: string]: boolean;
}

export class ClientInput {
	interval: number = 0;

	keys: Keys;

	mouseClick: boolean = false;
	mousePos: Vec2;

	constructor() {
		this.mousePos = new Vec2();

		this.keys = {
			"up": false,
			"down": false,
			"left": false,
			"right": false,
		}
	}
}