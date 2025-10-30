import { session } from "./session";
import { renderGame, resizeCanvas } from "./canvas";
import { config } from "../shared/config";
import { emitPlayerMove } from "./socket";

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
      moveUpdate();

      emitPlayerMove();
   });

   document.addEventListener("keyup", (e: KeyboardEvent) => {
      session.keys[e.key.toLowerCase()] = false;
      moveUpdate();

      emitPlayerMove();
   });

   document.addEventListener("click", (e: MouseEvent) => {
      if (!session.canvas || !session.player) return;

      session.saveMouseCoords(e.clientX, e.clientY);
      session.player.attemptDash(session.mousePos);

      emitPlayerMove();
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

   if (session.player) {
      session.room?.gameState.updateAll(dt, true);
   }
   renderGame();

   // Request the next frame
   session.gameLoop = requestAnimationFrame(gameLoop);
}

export function startGameLoop(): void {
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

function moveUpdate(): void {
   if (!session.player) return;

   session.player.moveVel.x =
      ((session.keys["d"] || session.keys["arrowright"] ? 1 : 0) - (session.keys["a"] || session.keys["arrowleft"] ? 1 : 0)) *
      config.moveSpeed;

   session.player.moveVel.y =
      ((session.keys["s"] || session.keys["arrowdown"] ? 1 : 0) - (session.keys["w"] || session.keys["arrowup"] ? 1 : 0)) *
      config.moveSpeed;
}
