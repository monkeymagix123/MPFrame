import { ChatMessage } from "./chat";
import { Player } from "./player";

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
	x: number;
	y: number;
	dashX?: number;
	dashY?: number;
}

export interface Keys {
	[key: string]: boolean;
}