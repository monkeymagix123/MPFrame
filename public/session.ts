import { io, Socket } from "socket.io-client";
import { ClientInput, Keys } from "../shared/types";
import { Vec2 } from "../shared/v2";
import { config } from "../shared/config";
import { settings } from "./settings";
import { PlayerC } from "./player";

class Session {
	socket: Socket;
	currentRoom: string | null;
	keys: Keys;
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	gameLoop: number | null;

	mousePos: Vec2;
	currentPlayer: PlayerC | undefined;
	clientInput: ClientInput;

	constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
		this.socket = io() as Socket;
		this.currentRoom = null;
		this.keys = {} as Keys;
		this.canvas = canvas as HTMLCanvasElement;
		this.ctx = ctx as CanvasRenderingContext2D;
		this.gameLoop = null as number | null;
		this.mousePos = new Vec2();
		this.currentPlayer = undefined;
		this.clientInput = new ClientInput();
	}

	resetSession(): void {
		this.currentRoom = null;
		this.keys = {} as Keys;
		this.gameLoop = null;
		this.mousePos = new Vec2();
		this.currentPlayer = undefined;
		this.clientInput = new ClientInput();
	}

	resetInput(): void {
		// this.clientInput = new ClientInput();
		this.clientInput.interval = 0;
		this.clientInput.mouseClick = false;
	}

	saveMouseCoords(mouseX: number, mouseY: number): void {
	  const rect = session.canvas.getBoundingClientRect();

	  this.mousePos.x = (mouseX - rect.left) * config.width / session.canvas.width * settings.resolutionScale;
	  this.mousePos.y = (mouseY - rect.top) * config.height / session.canvas.height * settings.resolutionScale;
	}
}

export const session = new Session(
	document.getElementById("game-canvas") as HTMLCanvasElement,
	(document.getElementById("game-canvas") as HTMLCanvasElement)?.getContext("2d") as CanvasRenderingContext2D
);