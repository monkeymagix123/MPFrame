import * as state from "./state";
import { clamp } from "../shared/math";

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

  const scale = 2;

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
  const playerRadius = 15;

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
  const dashDistance = 100.0;
  // Normalize and scale the dash vector
  let dashVecX = (dx / length) * dashDistance;
  let dashVecY = (dy / length) * dashDistance;

  if (state.startDash) {
    if (state.dashCooldown <= 0.1) {
      // do a dash
      state.currentPlayer.x = clamp(state.currentPlayer.x + dashVecX, playerRadius, canvasWidth - playerRadius);
      state.currentPlayer.y = clamp(state.currentPlayer.y + dashVecY, playerRadius, canvasHeight - playerRadius);

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

function renderGame(): void {
  if (!state.ctx || !state.canvas) return;

  const playerRadius = 15;

  state.ctx.fillStyle = "#f0f0f0";
  state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);

  state.players.forEach((player) => {
    if (!state.ctx) return;

    state.ctx.beginPath();
    state.ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
    state.ctx.fillStyle = player.team === "red" ? "#f44336" : "#2196F3";
    state.ctx.fill();

    if (player.id === state.socket.id) {
      state.ctx.strokeStyle = "#333";
      state.ctx.lineWidth = 3;
      state.ctx.stroke();
    }

    state.ctx.fillStyle = "#333";
    state.ctx.font = "12px Arial";
    state.ctx.textAlign = "center";
    const name = player.id === state.socket.id ? "You" : player.name || player.id.substring(0, 4);
    state.ctx.fillText(name, player.x, player.y - 25);
  });

  redrawArrow(state.mouseX, state.mouseY);
}

// dash cooldown thing
function redrawArrow(x: number, y: number): void {
  const playerRadius = 15;
  if (!state.currentPlayer || !state.canvas) return;

  const rect = state.canvas.getBoundingClientRect();
  x -= rect.left;
  y -= rect.top;

  let dx = x - state.currentPlayer.x;
  let dy = y - state.currentPlayer.y;

  let length = Math.sqrt(dx * dx + dy * dy);

  // Using the same 100 unit distance for the arrow display
  const arrowDistance = 100.0;

  let arrowVecX = (dx / length) * arrowDistance;
  let arrowVecY = (dy / length) * arrowDistance;

  let toX = clamp(state.currentPlayer.x + arrowVecX, playerRadius, state.canvas.width - playerRadius);
  let toY = clamp(state.currentPlayer.y + arrowVecY, playerRadius, state.canvas.height - playerRadius);

  console.log(Object.keys(state.currentPlayer));
  console.log("Drawing arrow to:", toX, toY);

  drawArrow(state.currentPlayer.x, state.currentPlayer.y, toX, toY);
}

function drawArrow(fromX: number, fromY: number, toX: number, toY: number): void {
  if (!state.ctx) return;

  console.log(fromX, fromY, toX, toY); // THIS THING

  const headLength = 30; // length of head in pixels

  let dx = toX - fromX;
  let dy = toY - fromY;

  const angle = Math.atan2(dy, dx);

  // draw the line
  state.ctx.lineWidth = 10;

  let length = Math.sqrt(dx * dx + dy * dy);
  let lengthMissing = length * Math.max(0, state.dashCooldown);

  state.ctx.beginPath();
  state.ctx.moveTo(fromX, fromY);
  state.ctx.lineTo(toX - length * 0.1 * Math.cos(angle), toY - length * 0.1 * Math.sin(angle));
  state.ctx.strokeStyle = "rgba(250, 227, 17, 1)";
  state.ctx.stroke();

  // draw anti-line for not done part
  state.ctx.lineWidth = 6;
  state.ctx.beginPath();
  state.ctx.moveTo(toX - length * 0.12 * Math.cos(angle), toY - length * 0.12 * Math.sin(angle));
  state.ctx.lineTo(toX - lengthMissing * Math.cos(angle), toY - lengthMissing * Math.sin(angle));
  state.ctx.strokeStyle = "rgba(240, 240, 240, 1)";
  state.ctx.stroke();

  // draw the arrowhead
  if (state.dashCooldown < 0.1) {
    state.ctx.beginPath();
    state.ctx.moveTo(toX, toY);
    state.ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    state.ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    state.ctx.lineTo(toX, toY);
    state.ctx.fillStyle = "rgba(250, 227, 17, 1)";
    state.ctx.fill();
  }

  console.log("hi");
}