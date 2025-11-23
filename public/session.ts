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
	input: ClientInput;

   recentInputs: ClientInput[] = [];

	constructor(canvas: HTMLCanvasElement) {
		this.socket = io() as Socket;
		this.currentRoom = null;

		this.canvasManager = new GraphicsManager(canvas);
		this.gameLoop = null as number | null;

		this.currentPlayer = undefined;

		this.keys = {} as Keys;
		this.mousePos = new Vec2();
		this.input = new ClientInput();
	}

	resetSession(): void {
		this.currentRoom = null;
		this.keys = {} as Keys;
		this.gameLoop = null;
		this.mousePos = new Vec2();
		this.currentPlayer = undefined;
		this.input = new ClientInput();
	}

	resetInput(): void {
		// this.clientInput = new ClientInput();
		this.input.interval = 0;
		this.input.mouseClick = false;
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
      if (moved || this.input.mouseClick) {
         this.input.keys = keys;

         this.input.interval = dt;
         this.socket.emit("game/client-input", this.input);
         this.resetInput();
      }
   }

   // input handlers

   
	/**
	 * Called when the user clicks on the game canvas.
	 * Saves the mouse position to session.mousePos and
	 * attempts to dash if the player is currently alive.
	 * @param {MouseEvent} e - The mouse event data.
	 */
   onClick(e: MouseEvent): void {
      if (!this.canvasManager.canvas) return;
		
		// Converts raw mouse coordinates to game coordinates and save the coordinates
		this.saveMouseCoords(e.clientX, e.clientY);

		// Attempt to dash
		if (this.currentPlayer) {
			this.currentPlayer.attemptDash(this.mousePos);
		}

		this.input.mouseClick = true;
		this.input.mousePos = this.mousePos;
   }
}

const gameCanvas = document.getElementById("game-canvas") as HTMLCanvasElement;
export const session = new Session(gameCanvas);