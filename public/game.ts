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
    session.keys[e.key.toLowerCase()] = true;
    inputUpdate();
  });

  document.addEventListener("keyup", (e: KeyboardEvent) => {
    session.keys[e.key.toLowerCase()] = false;
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

function inputUpdate(): void {
  if (!session.currentPlayer) return;
  
  session.currentPlayer.vel.x =
    ((session.keys["w"] || session.keys["arrowup"] ? 1 : 0) - 
    (session.keys["s"] || session.keys["arrowdown"] ? 1 : 0)) 
    * config.playerSpeed;

  session.currentPlayer.vel.y = 
    ((session.keys["d"] || session.keys["arrowright"] ? 1 : 0) - 
    (session.keys["a"] || session.keys["arrowleft"] ? 1 : 0)) 
    * config.playerSpeed;
}

// Changed to accept dt (delta time)
function updateGame(dt: number): void {
  if (!session.currentPlayer || !session.canvas) return;

  let moved = false;

  // Decrement cooldown based on delta time in seconds
  session.currentPlayer.decrementCooldown(dt);
  session.currentPlayer.pos = clampPos(v2.add(session.currentPlayer.pos, v2.mul(session.currentPlayer.vel, dt)));

  if (moved) {
    // emit current player
    session.socket.emit("game/player-move", {
      pos: session.currentPlayer.pos,
    });
  }
}