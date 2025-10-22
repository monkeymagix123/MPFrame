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

export interface PlayerMoveData {
	id: string;
	pos: Vec2;
	dashPos?: Vec2;
}

export interface Keys {
	[key: string]: boolean;
}