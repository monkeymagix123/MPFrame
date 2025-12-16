import { session } from "./session";
import { renderGame, resizeCanvas } from "./canvas";
import { config } from "../shared/config";
import { emitPlayerMove } from "./socket";
import { v2 } from "../shared/v2";

export function initGame(): void {
   const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
   if (!canvas) return;

   session.canvas.classList.remove('hidden');

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
      session.saveMouseCoords(e.clientX, e.clientY);
   });
}

function moveUpdate(): void {
   if (!session.player) return;

   session.player.moveVel.x =
      ((session.keys["d"] || session.keys["arrowright"] ? 1 : 0) - (session.keys["a"] || session.keys["arrowleft"] ? 1 : 0)) *
      session.player.stats.moveSpeed;

   session.player.moveVel.y =
      ((session.keys["s"] || session.keys["arrowdown"] ? 1 : 0) - (session.keys["w"] || session.keys["arrowup"] ? 1 : 0)) *
      session.player.stats.moveSpeed;
   
   session.player.moveVel = v2.mul(v2.normalize(session.player.moveVel), session.player.stats.moveSpeed);
}
