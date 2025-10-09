import * as state from "./state.js";
import { clamp } from "./mathUtil.js";

export function initGame() {
   const canvas = document.getElementById("game-canvas");
   state.setCanvas(canvas);
   resizeCanvas();
   setupGameControls();
   state.socket.emit("get-lobbies");

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

   // Set the canvas internal size to match the display size
   canvas.width = displayWidth;
   canvas.height = displayHeight;

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
}

export function startGameLoop() {
   const loop = setInterval(() => {
      updateGame();
      renderGame();
   }, 1000 / 60);
   state.setGameLoop(loop);
}

export function stopGameLoop() {
   if (state.gameLoop) {
      clearInterval(state.gameLoop);
      state.setGameLoop(null);
   }
}

function updateGame() {
   if (!state.currentPlayer) return;

   let moved = false;
   const speed = 3;

   // Use canvas dimensions for boundary checking
   const canvasWidth = state.canvas.width;
   const canvasHeight = state.canvas.height;
   const playerRadius = 15;

   if (state.keys["w"] || state.keys["arrowup"]) {
      state.currentPlayer.y = Math.max(playerRadius, state.currentPlayer.y - speed);
      moved = true;
   }
   if (state.keys["s"] || state.keys["arrowdown"]) {
      state.currentPlayer.y = Math.min(canvasHeight - playerRadius, state.currentPlayer.y + speed);
      moved = true;
   }
   if (state.keys["a"] || state.keys["arrowleft"]) {
      state.currentPlayer.x = Math.max(playerRadius, state.currentPlayer.x - speed);
      moved = true;
   }
   if (state.keys["d"] || state.keys["arrowright"]) {
      state.currentPlayer.x = Math.min(canvasWidth - playerRadius, state.currentPlayer.x + speed);
      moved = true;
   }

   if (state.startDash) {
      if (state.dashCooldown <= 0.1) {
         // do a dash
         let dx = state.dashX - state.currentPlayer.x;
         let dy = state.dashY - state.currentPlayer.y;

         let length = Math.sqrt(dx * dx + dy * dy);

         dx *= 100.0 / length;
         dy *= 100.0 / length;

         state.currentPlayer.x = clamp(state.currentPlayer.x + dx, playerRadius, canvasWidth - playerRadius);
         state.currentPlayer.y = clamp(state.currentPlayer.y + dy, playerRadius, canvasHeight - playerRadius);

         // 1 sec dash cooldown
         state.startCooldown();
      }

      state.resetDash();
   }

   state.decrementCooldown(1 / 60);

   if (moved) {
      state.socket.emit("player-move", {
         x: state.currentPlayer.x,
         y: state.currentPlayer.y,
      });
   }
}

function renderGame() {
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
