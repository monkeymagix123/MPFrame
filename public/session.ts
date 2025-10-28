import { io, Socket } from "socket.io-client";
import { ClientInput, Keys } from "../shared/types";
import { Vec2 } from "../shared/v2";
import { PlayerC } from "./player";
import { CanvasManager } from "./helpers/graphicsManager";

class Session {
	// Network info
	socket: Socket;
	currentRoom: string | null;

	// UI manager
	canvasManager: CanvasManager;

	gameLoop: number | null;

	// Current player
	currentPlayer: PlayerC | undefined;

	// Client inputs
	mousePos: Vec2;
	keys: Keys;
	clientInput: ClientInput;

	constructor(canvas: HTMLCanvasElement) {
		this.socket = io() as Socket;
		this.currentRoom = null;
		this.keys = {} as Keys;
		this.canvasManager = new CanvasManager(canvas);
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
		this.mousePos = this.canvasManager.getCoordsFromMouse(mouseX, mouseY);
	}
}

export const session = new Session(
	document.getElementById("game-canvas") as HTMLCanvasElement
);