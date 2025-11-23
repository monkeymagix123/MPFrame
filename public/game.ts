import { session } from "./session";
import { renderGame, resizeCanvas } from "./canvas";   
import { config } from "../shared/config";
import { hasCanvas } from "./helpers/graphicsManager";

// Global variable to store the timestamp of the last frame
let lastTime = 0;
let lastDrawTime = 0;

/**
 * Initializes the game (resize canvas, set up keybinds & mouse events).
 * Does nothing if the canvas does not exist.
 */
export function initGame(): void {
	if (!hasCanvas()) return;

	resizeCanvas();
	setupGameControls();
	
	window.addEventListener("resize", resizeCanvas);
}

/**
 * Sets up keybinds and mouse events for the game.
 */
function setupGameControls(): void {
	document.addEventListener("keydown", (e: KeyboardEvent) => {
		session.keys[e.key.toLowerCase()] = true;
	});

	document.addEventListener("keyup", (e: KeyboardEvent) => {
		session.keys[e.key.toLowerCase()] = false;
	});

	document.addEventListener("click", (e: MouseEvent) => session.onClick(e));

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
	session.update(dt);
}