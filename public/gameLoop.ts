import { renderGame } from "./canvas";
import { session } from "./session";

// Global variable to store the timestamp of the last frame
let lastTime = 0;
const lastDrawTime = 0;

// The main game loop function using requestAnimationFrame
function gameLoop(currentTime: number): void {
   const dt = (currentTime - lastTime) / 1000;
   lastTime = currentTime;

   if (session.player) {
      session.room?.gameState.updateAll(dt, false);
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