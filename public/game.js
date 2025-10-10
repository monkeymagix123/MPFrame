import * as state from "./state.js";
import { clamp } from "./mathUtil.js";

// Global variable to store the timestamp of the last frame
let lastTime = 0;

let lastDrawTime = 0;

export function initGame() {
   const canvas = document.getElementById("game-canvas");
   state.setCanvas(canvas);
   setupGameControls();
   state.socket.emit("get-lobbies");

   resizeCanvas();
   // Resize canvas when window is resized
   window.addEventListener("resize", resizeCanvas);
}

function resizeCanvas() {
   const canvas = document.getElementById("game-canvas");
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
   ctx.setTransform(scale, 0, 0, scale, 0, 0);

   // Update the canvas reference in state if needed
   state.setCanvas(canvas);
}

function setupGameControls() {
   document.addEventListener("keydown", (e) => {
      state.keys[e.key.toLowerCase()] = true;
   });

   document.addEventListener("keyup", (e) => {
      state.keys[e.key.toLowerCase()] = false;
   });

   document.addEventListener("click", (e) => {
      const rect = state.canvas.getBoundingClientRect();
      state.doDash(e.clientX - rect.left, e.clientY - rect.top);
   });

   document.addEventListener("mousemove", (e) => {
      if (Date.now() - lastDrawTime < 20) return;
      lastDrawTime = Date.now();
      if (!state.currentPlayer) return;
      redrawArrow(e.clientX, e.clientY);
   });
}

// The main game loop function using requestAnimationFrame
function gameLoop(currentTime) {
   const dt = (currentTime - lastTime) / 1000;
   lastTime = currentTime;

   // Prevent large jumps in time (e.g., if the user switches tabs)
   const safeDt = Math.min(dt, 0.2);

   updateGame(safeDt);
   renderGame();

   // Request the next frame
   state.setGameLoop(requestAnimationFrame(gameLoop));
}

export function startGameLoop() {
   // Start the requestAnimationFrame loop
   if (state.gameLoop === null) {
      lastTime = performance.now(); // Initialize lastTime
      state.setGameLoop(requestAnimationFrame(gameLoop));
   }
}

export function stopGameLoop() {
   if (state.gameLoop) {
      cancelAnimationFrame(state.gameLoop);
      state.setGameLoop(null);
   }
}

// Changed to accept dt (delta time)
function updateGame(dt) {
   if (!state.currentPlayer) return;

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

function renderGame() {
   const playerRadius = 15;

   state.ctx.fillStyle = "#f0f0f0";
   state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);

   state.players.forEach((player) => {
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
}

// dash cooldown thing
function redrawArrow(x, y) {
   const playerRadius = 15;
   if (!state.currentPlayer) return;

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

function drawArrow(fromX, fromY, toX, toY) {
   console.log(fromX, fromY, toX, toY); // THIS THING

   const headLength = 10; // length of head in pixels
   const dx = toX - fromX;
   const dy = toY - fromY;
   const angle = Math.atan2(dy, dx);

   // draw the line
   state.ctx.lineWidth = 50;
   
   state.ctx.beginPath();
   state.ctx.moveTo(fromX, fromY);
   state.ctx.lineTo(toX, toY);

   state.ctx.strokeStyle = "rgba(250, 227, 17, 1)";
   state.ctx.stroke();

   // draw the arrowhead
   state.ctx.beginPath();
   state.ctx.moveTo(toX, toY);
   state.ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
   state.ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
   state.ctx.lineTo(toX, toY);
   
   state.ctx.fillStyle = "rgba(250, 227, 17, 1)";
   state.ctx.fill();

         state.ctx.beginPath();
      state.ctx.arc(toX, toY, 15, 0, Math.PI * 2);
      // state.ctx.fillStyle = player.team === "red" ? "#f44336" : "#2196F3";
      state.ctx.fill();
   
      console.log("hi");
}
