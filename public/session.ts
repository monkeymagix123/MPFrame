import { io, Socket } from "socket.io-client";
import { Keys } from "../shared/types";
import { Player } from "../shared/player";

class Session {
	socket: Socket;
	currentRoom: string | null;
	keys: Keys;
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	gameLoop: number | null;
	mouseX: number;
	mouseY: number;
	currentPlayer: Player | null;

	constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
		this.socket = io() as Socket;
		this.currentRoom = null;
		this.keys = {} as Keys;
		this.canvas = canvas as HTMLCanvasElement;
		this.ctx = ctx as CanvasRenderingContext2D;
		this.gameLoop = null as number | null;
		this.mouseX = 0;
		this.mouseY = 0;
		this.currentPlayer = null;
	}

	resetSession(): void {
		this.currentRoom = null;
		this.keys = {} as Keys;
		this.gameLoop = null;
		this.mouseX = 0;
		this.mouseY = 0;
		this.currentPlayer = null;
	}
}

export const session = new Session(
	document.getElementById("game-canvas") as HTMLCanvasElement,
	(document.getElementById("game-canvas") as HTMLCanvasElement)?.getContext("2d") as CanvasRenderingContext2D
);