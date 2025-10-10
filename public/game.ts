import * as state from "./state";
import { clamp } from "../shared/math";
import { Config } from "../shared/config";
import { renderGame } from "./canvas"; 
import { clampPos } from "./canvasUtil";

// Global variable to store the timestamp of the last frame
let lastTime = 0;
let lastDrawTime = 0;

export function initGame(): void {
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
  if (!canvas) return;

  state.setCanvas(canvas);
  setupGameControls();

  resizeCanvas();
  // Resize canvas when window is resized
  window.addEventListener("resize", resizeCanvas);
}

function resizeCanvas(): void {
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
  const gameArea = document.getElementById("game-area");

  if (!canvas || !gameArea) return;

  // Get the display size (CSS size) of the game area
  const rect = gameArea.getBoundingClientRect();
  const displayWidth = rect.width;
  const displayHeight = rect.height;

  const scale = Config.scale;

  // Set the canvas internal size to double resolution
  canvas.width = displayWidth * scale;
  canvas.height = displayHeight * scale;

  // Keep the same display size in CSS
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;

  // Scale the rendering context to match
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  // Update the canvas reference in state if needed
  state.setCanvas(canvas);
}

function setupGameControls(): void {
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    state.keys[e.key.toLowerCase()] = true;
  });

  document.addEventListener("keyup", (e: KeyboardEvent) => {
    state.keys[e.key.toLowerCase()] = false;
  });

  document.addEventListener("click", (e: MouseEvent) => {
    if (!state.canvas) return;
    const rect = state.canvas.getBoundingClientRect();
    state.doDash(e.clientX - rect.left, e.clientY - rect.top);
  });

  document.addEventListener("mousemove", (e: MouseEvent) => {
    if (Date.now() - lastDrawTime < 20) return;
    lastDrawTime = Date.now();
    state.setMousePosition(e.clientX, e.clientY);
  });
}

// The main game loop function using requestAnimationFrame
function gameLoop(currentTime: number): void {
  const dt = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  // Prevent large jumps in time (e.g., if the user switches tabs)
  const safeDt = Math.min(dt, 0.2);

  updateGame(safeDt);
  renderGame();

  // Request the next frame
  state.setGameLoop(requestAnimationFrame(gameLoop));
}

export function startGameLoop(): void {
  // Start the requestAnimationFrame loop
  if (state.gameLoop === null) {
    lastTime = performance.now(); // Initialize lastTime
    state.setGameLoop(requestAnimationFrame(gameLoop));
  }
}

export function stopGameLoop(): void {
  if (state.gameLoop !== null) {
    cancelAnimationFrame(state.gameLoop);
    state.setGameLoop(null);
  }
}

// Changed to accept dt (delta time)
function updateGame(dt: number): void {
  if (!state.currentPlayer || !state.canvas) return;

  let moved = false;
  // Convert speed to be measured in units per second
  // 3 units per 1/60th of a second (original logic) is 180 units per second.
  const speedPerSecond = 180;
  // Actual speed is speedPerSecond * dt, which is a consistent distance regardless of frame rate

  // Use canvas dimensions for boundary checking
  const canvasWidth = state.canvas.width;
  const canvasHeight = state.canvas.height;
  const playerRadius = Config.playerRadius;

  const distance = speedPerSecond * dt; // The distance to move this frame

  if (state.keys["w"] || state.keys["arrowup"]) {
    state.currentPlayer.y = Math.max(playerRadius, state.currentPlayer.y - distance);
    moved = true;
  }
  if (state.keys["s"] || state.keys["arrowdown"]) {
    state.currentPlayer.y = Math.min(canvasHeight - playerRadius, state.currentPlayer.y + distance);
    moved = true;
  }
  if (state.keys["a"] || state.keys["arrowleft"]) {
    state.currentPlayer.x = Math.max(playerRadius, state.currentPlayer.x - distance);
    moved = true;
  }
  if (state.keys["d"] || state.keys["arrowright"]) {
    state.currentPlayer.x = Math.min(canvasWidth - playerRadius, state.currentPlayer.x + distance);
    moved = true;
  }

  // dash & arrow calculation
  let dx = state.dashX - state.currentPlayer.x;
  let dy = state.dashY - state.currentPlayer.y;

  let length = Math.sqrt(dx * dx + dy * dy);

  // Assuming a fixed dash distance of 100 units (original code logic)
  const dashDistance = Config.dashDistance;
  // Normalize and scale the dash vector
  let dashVecX = (dx / length) * dashDistance;
  let dashVecY = (dy / length) * dashDistance;

  if (state.startDash) {
    if (state.dashCooldown <= 0.1) {
      // do a dash
      const { x: clampedX, y: clampedY } = clampPos(state.currentPlayer.x + dashVecX, state.currentPlayer.y + dashVecY);
      state.currentPlayer.x = clampedX;
      state.currentPlayer.y = clampedY;

      // 1 sec dash cooldown
      state.startCooldown();
    }

    state.resetDash();
  }

  // Decrement cooldown based on delta time in seconds
  state.decrementCooldown(dt);

  if (moved) {
    state.socket.emit("player-move", {
      x: state.currentPlayer.x,
      y: state.currentPlayer.y,
    });
  }
}
