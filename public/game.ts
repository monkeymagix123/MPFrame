import { session } from "./session";
import { renderGame, resizeCanvas } from "./canvas";   
import { config } from "../shared/config";
import { settings } from "./settings";
import { Vec2 } from "../shared/v2";

// Global variable to store the timestamp of the last frame
let lastTime = 0;
let lastDrawTime = 0;

export function initGame(): void {
	const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
	if (!canvas) return;

	resizeCanvas();
	setupGameControls();
	
	window.addEventListener("resize", resizeCanvas);
}

function setupGameControls(): void {
	document.addEventListener("keydown", (e: KeyboardEvent) => {
		session.keys[e.key.toLowerCase()] = true;
		session.clientInput.keys[e.key.toLowerCase()] = true;
	});

	document.addEventListener("keyup", (e: KeyboardEvent) => {
		session.keys[e.key.toLowerCase()] = false;
		session.clientInput.keys[e.key.toUpperCase()] = false;
	});

	document.addEventListener("click", (e: MouseEvent) => {
		if (!session.canvas) return;
		
		// Converts raw mouse coordinates to game coordinates
		session.saveMouseCoords(e.clientX, e.clientY);

		// Attempt to dash
		if (session.currentPlayer) {
			session.currentPlayer.attemptDash(session.mousePos);
		}

		session.clientInput.mouseClick = true;
		session.clientInput.mousePos = session.mousePos;

		session.socket.emit("game/player-move", {
			pos: session.currentPlayer?.pos,
		});
	});

	document.addEventListener("mousemove", (e: MouseEvent) => {
		if (performance.now() - lastDrawTime < 20) return; 
		lastDrawTime = performance.now();

		// Converts raw mouse coordinates to game coordinates
		session.saveMouseCoords(e.clientX, e.clientY);
	});
}

// The main game loop function using requestAnimationFrame
function gameLoop(currentTime: number): void {
	const dt = (currentTime - lastTime) / 1000;
	lastTime = currentTime;

	updateGame(dt);
	renderGame();
 
	// Request the next frame
	session.gameLoop = requestAnimationFrame(gameLoop);
}

export function startGameLoop(): void {
	// Start the requestAnimationFrame loop
	if (session.gameLoop === null) { 
		lastTime = performance.now(); 
		session.gameLoop = requestAnimationFrame(gameLoop);
	}
}

export function stopGameLoop(): void {
	if (session.gameLoop !== null) {
		cancelAnimationFrame(session.gameLoop);
		session.gameLoop = null;
	}
}

// Changed to accept dt (delta time)
function updateGame(dt: number): void {
	if (!session.currentPlayer || !session.canvas) return;

	let moved = false;
	const speedPerSecond = config.speedPerSecond;

	if (session.keys["w"] || session.keys["arrowup"]) {
		session.currentPlayer.moveUp(speedPerSecond * dt);
		moved = true;
	}
	if (session.keys["s"] || session.keys["arrowdown"]) {
		session.currentPlayer.moveDown(speedPerSecond * dt);
		moved = true;
	}
	if (session.keys["a"] || session.keys["arrowleft"]) {
		session.currentPlayer.moveLeft(speedPerSecond * dt);
		moved = true;
	}
	if (session.keys["d"] || session.keys["arrowright"]) {
		session.currentPlayer.moveRight(speedPerSecond * dt);
		moved = true;
	}

	// Decrement cooldown based on delta time in seconds
	session.currentPlayer.decrementCooldown(dt);

	if (moved) {
		// emit current player
		session.socket.emit("game/player-move", {
			pos: session.currentPlayer.pos,
		});

		session.clientInput.interval = dt;
		session.socket.emit("game/client-input", session.clientInput);
		session.resetInput();
	}
}