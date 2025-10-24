import { session } from "./session";
import { renderGame, resizeCanvas } from "./canvas";   
import { config } from "../shared/config";
import { settings } from "./settings";
import { v2, Vec2 } from "../shared/v2";
import { clampPos } from "../shared/math";

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
		const key = e.key.toLowerCase();
		session.keys[key] = true;
		session.clientInput.keys[key] = true;
		inputUpdate();
	});

	document.addEventListener("keyup", (e: KeyboardEvent) => {
		const key = e.key.toLowerCase();
		session.keys[key] = false;
		session.clientInput.keys[key] = false;
		inputUpdate();
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

function inputUpdate(): void {
  if (!session.currentPlayer) return;
  
   session.currentPlayer.vel.x = 
      ((session.keys["d"] || session.keys["arrowright"] ? 1 : 0) - 
      (session.keys["a"] || session.keys["arrowleft"] ? 1 : 0)) 
      * config.playerSpeed;

   session.currentPlayer.vel.y = 
      ((session.keys["s"] || session.keys["arrowdown"] ? 1 : 0) - 
      (session.keys["w"] || session.keys["arrowup"] ? 1 : 0))
      * config.playerSpeed;
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

	// moving position or trying to dash
	if (moved || session.clientInput.mouseClick) {
		// emit current player
		// session.socket.emit("game/player-move", {
		// 	pos: session.currentPlayer.pos,
		// });

		session.clientInput.interval = dt;
		// session.clientInput.id = session.currentPlayer.id;
		session.socket.emit("game/client-input", session.clientInput);
		session.resetInput();
	}
}