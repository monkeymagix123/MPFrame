import { io, Socket } from "socket.io-client";
import { ClientInput, Keys } from "../shared/types";
import { Vec2 } from "../shared/v2";
import { PlayerC } from "./player";
import { GraphicsManager } from "./helpers/graphicsManager";

class Session {
	// Network info
	socket: Socket;
	currentRoom: string | null;

	// UI manager
	canvasManager: GraphicsManager;

	gameLoop: number | null;

	// Current player
	currentPlayer: PlayerC | undefined;

	// Client inputs
	mousePos: Vec2;
	keys: Keys;
	clientInput: ClientInput;

   recentInputs: ClientInput[] = [];

	constructor(canvas: HTMLCanvasElement) {
		this.socket = io() as Socket;
		this.currentRoom = null;

		this.canvasManager = new GraphicsManager(canvas);
		this.gameLoop = null as number | null;

		this.currentPlayer = undefined;

		this.keys = {} as Keys;
		this.mousePos = new Vec2();
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

   update(dt: number): void {
      if (!this.currentPlayer || !this.canvasManager.canvas) return;

      const keys = this.keys;

      // Move player
      let moved = this.currentPlayer.move(keys, dt);

      // Update by delta time in seconds
      this.currentPlayer.update(dt);

      // if moving position or trying to dash, send data to server
      if (moved || this.clientInput.mouseClick) {
         this.clientInput.keys = keys;

         this.clientInput.interval = dt;
         this.socket.emit("game/client-input", this.clientInput);
         this.resetInput();
      }
   }
}

export const session = new Session(
	document.getElementById("game-canvas") as HTMLCanvasElement
);