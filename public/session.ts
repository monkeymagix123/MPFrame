import { io, Socket } from "socket.io-client";
import { Keys } from "../shared/types";
import { Player } from "../shared/player";

class Session {
	socket: Socket;
	currentRoom: string | null;
	keys: Keys;
	canvas: HTMLCanvasElement | null;
	ctx: CanvasRenderingContext2D | null;
	gameLoop: number | null;
	mouseX: number;
	mouseY: number;
	currentPlayer: Player | null;

	constructor() {
		this.socket = io() as Socket;
		this.currentRoom = null;
		this.keys = {} as Keys;
		this.canvas = null as HTMLCanvasElement | null;
		this.ctx = null as CanvasRenderingContext2D | null;
		this.gameLoop = null as number | null;
		this.mouseX = 0;
		this.mouseY = 0;
		this.currentPlayer = null;
	}

	resetSession(): void {
		this.currentRoom = null;
		this.keys = {} as Keys;
		this.canvas = null;
		this.ctx = null;
		this.gameLoop = null;
		this.mouseX = 0;
		this.mouseY = 0;
		this.currentPlayer = null;
	}
}

export const session = new Session();