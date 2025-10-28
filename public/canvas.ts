import { config } from "../shared/config";
import { clamp, clampPosV } from "../shared/math";
import { Player } from "../shared/player";
import { state } from "./state";
import { v2, Vec2 } from "../shared/v2";
import { session } from "./session";
import { settings } from "./settings";

// FPS tracking
let lastFrameTime = performance.now();
let fps = 0;
const fpsHistory: number[] = [];
const fpsHistorySize = 30;

export function resizeCanvas(): void {
   const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
   const gameArea = document.getElementById("game-area");

   if (!canvas || !gameArea) return;

   // Get the display size (CSS size) of the game area
   const rect = gameArea.getBoundingClientRect();
   const displayWidth = rect.width;
   const displayHeight = rect.height;

   // Set the canvas internal size to double resolution
   canvas.width = displayWidth * settings.resolutionScale;
   canvas.height = displayHeight * settings.resolutionScale;

   // Keep the same display size in CSS
   canvas.style.width = `${displayWidth}px`;
   canvas.style.height = `${displayHeight}px`;

   // Scale the rendering context to match
   const scale = canvas.width / config.width;
   session.canvasManager.ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

export function renderGame(): void {
   if (!session.canvasManager.ctx || !session.canvasManager.canvas) return;

   const ctx = session.canvasManager.ctx;

   // Update FPS
   const currentTime = performance.now();
   const deltaTime = currentTime - lastFrameTime;
   lastFrameTime = currentTime;
   
   if (deltaTime > 0) {
      const currentFps = 1000 / deltaTime;
      fpsHistory.push(currentFps);
      if (fpsHistory.length > fpsHistorySize) {
         fpsHistory.shift();
      }
      fps = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
   }

	ctx.clearRect(0, 0, config.width, config.height)
   ctx.fillStyle = "#11111b";
   ctx.fillRect(0, 0, config.width, config.height)

   // Enable high quality effects if setting is on
   if (settings.highQuality) {
      ctx.shadowBlur = 0; // Reset for background
   }

   state.players.forEach((player) => {
      drawPlayer(player);
   });

   // Reset quality settings after rendering
   if (settings.highQuality) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
   }

   // Draw FPS counter if debug mode is on
   if (settings.debugMode) {
      drawFPS();
   }
}

function drawPlayer(player: Player): void {
   const ctx = session.canvasManager.ctx;

   if (!ctx) return;

   const isCurrentPlayer = player.id === session.socket.id;

   // Draw dash arrow for current player
   if (isCurrentPlayer) {
      drawDashArrow(session.mousePos);
   }

   const healthRatio = player.health / player.maxHealth;

   // High quality effects
   if (settings.highQuality) {
      ctx.shadowBlur = isCurrentPlayer ? 20 : 15;
      ctx.shadowColor = player.team === "red" ? "#ea4179" : "#5075f9";
   }

   // Reset shadow for outline
   if (settings.highQuality) {
      ctx.shadowBlur = 0;
   }

   ctx.strokeStyle = player.team === "red" ? "#ff6b9d" : "#7d9bff";

   if (settings.highQuality && isCurrentPlayer) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = player.team === "red" ? "#ff6b9d" : "#7d9bff";
   }

   ctx.lineWidth = (config.playerLength * healthRatio) / 2;
   ctx.strokeRect(
      player.pos.x - config.playerLength / 2 + ctx.lineWidth / 2,
      player.pos.y - config.playerLength / 2 + ctx.lineWidth / 2,
      config.playerLength - ctx.lineWidth,
      config.playerLength - ctx.lineWidth
   );

   // Draw outline for current player
   if (isCurrentPlayer) {
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.strokeRect(
         player.pos.x - config.playerLength / 2,
         player.pos.y - config.playerLength / 2,
         config.playerLength,
         config.playerLength
      );
   }

   if (settings.highQuality) {
      ctx.shadowBlur = 0;
   }

   // Draw player name
   ctx.font = "bold 12px Arial";
   ctx.textAlign = "center";
   ctx.fillStyle = "white";

   if (settings.highQuality) {
      // Add text shadow for better readability
      ctx.shadowBlur = 4;
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
   }

   const name = player.id === session.socket.id ? "You" : player.name || player.id.substring(0, 4);
   ctx.fillText(name, player.pos.x, player.pos.y - 25);

   if (settings.highQuality) {
      ctx.shadowBlur = 0;
   }
}

function drawDashArrow(toV: Vec2): void {
   if (!session.currentPlayer || !session.canvasManager.canvas) return;

   // Using the same 100 unit distance for the arrow display
   const arrowDistance = config.dashDistance;

   let arrowVec = v2.mul(v2.directionNormalized(session.currentPlayer.pos, toV), arrowDistance);

   let toPos = clampPosV(v2.add(session.currentPlayer.pos, arrowVec));

   let ratio = clamp(session.currentPlayer.dashCooldown / config.dashCooldown, 0, 1);
   drawArrow(session.currentPlayer.pos, toPos, ratio);
}

/**
 * Draws arrow from start to end, with a ratio of how charged it is.
 * White for uncharged part (near end), yellow for charged part.
 * @param k The ratio of how charged it is, should be between 0 and 1
 */
function drawArrow(fromPos: Vec2, toPos: Vec2, k: number): void {
   const ctx = session.canvasManager.ctx;

   if (!ctx) return;

   const headLength = config.headLength; // length of head in pixels

   // Get difference in position
   let dpos = v2.sub(toPos, fromPos);

   // Calculate angle and length of the arrow
   const angle = Math.atan2(dpos.y, dpos.x);
   const vAngle = v2.normalize(dpos);
   // const angle = v2.normalize(dpos);
   // const length = Math.sqrt(dx * dx + dy * dy);
   const length = v2.length(dpos);

   // Calculate how much of the arrow should be "charged" (inverse of cooldown)
   const chargedLength = length * (1 - k);

   // Calculates the position of the charged part
   const chargedPos = v2.add(fromPos, v2.mul(vAngle, chargedLength));

   const arrowBaseDistance = headLength * Math.cos(Math.PI / 6);

   // Draw the charged (yellow/orange) part of the line from the start to the charged position
   if (k >= 0) {
      ctx.lineWidth = config.playerLength / 3;
      ctx.beginPath();
      ctx.moveTo(fromPos.x, fromPos.y);

      // Check if fully charged
      if (k === 0) {
         // If fully charged, extend to just before the arrowhead base
         const slightBeforeEnd = v2.sub(toPos, v2.mul(vAngle, arrowBaseDistance));
         ctx.lineTo(slightBeforeEnd.x, slightBeforeEnd.y);
      } else {
         ctx.lineTo(chargedPos.x, chargedPos.y);
      }

      // high-quality effects
      if (settings.highQuality) {
         ctx.strokeStyle = "rgba(250, 200, 60, 0.7)";
         ctx.shadowBlur = 15;
         ctx.shadowColor = "rgba(250, 200, 60, 0.8)";
      } else {
         ctx.strokeStyle = "rgba(250, 200, 60, 1)";
      }
      ctx.stroke();
   }

   // Reset shadow for uncharged part
   if (settings.highQuality) {
      ctx.shadowBlur = 0;
   }


   // Draws the remaining uncharged (blue/cyan) part of the line
   // Goes from the charged part to the end
   ctx.lineWidth = 10;
   if (k > 0) {
      ctx.beginPath();
      ctx.moveTo(chargedPos.x, chargedPos.y);
      ctx.lineTo(toPos.x, toPos.y);

      if (settings.highQuality) {
         ctx.strokeStyle = "rgba(100, 180, 230, 0.6)";
         ctx.shadowBlur = 10;
         ctx.shadowColor = "rgba(100, 180, 230, 0.5)";
      } else {
         ctx.strokeStyle = "rgba(100, 180, 230, 1)";
      }
      ctx.stroke();
   }


   // Draw the arrowhead when fully charged
   if (k === 0) {
      if (settings.highQuality) {
         ctx.shadowBlur = 20;
         ctx.shadowColor = "rgba(250, 200, 60, 0.9)";
      }

      ctx.beginPath();
      ctx.moveTo(toPos.x, toPos.y);
      ctx.lineTo(toPos.x - headLength * Math.cos(angle - Math.PI / 6), toPos.y - headLength * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(toPos.x - headLength * Math.cos(angle + Math.PI / 6), toPos.y - headLength * Math.sin(angle + Math.PI / 6));
      ctx.closePath();

      if (settings.highQuality) {
         ctx.fillStyle = "rgba(250, 200, 60, 0.7)";
      } else {
         ctx.fillStyle = "rgba(250, 200, 60, 1)";
      }
      ctx.fill();

      if (settings.highQuality) {
         ctx.shadowBlur = 0;
      }
   }
}

function drawFPS(): void {
   const ctx = session.canvasManager.ctx;

   if (!ctx) return;

   // Save context state
   ctx.save();

   // Draw FPS in top right corner
   ctx.font = "bold 16px monospace";
   ctx.textAlign = "right";
   ctx.fillStyle = "#00ff00";

   // Add background for better readability
   const text = `FPS: ${Math.round(fps)}`;
   const textWidth = ctx.measureText(text).width;
   ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
   ctx.fillRect(config.width - textWidth - 20, 10, textWidth + 15, 25);

   // Draw FPS text
   ctx.fillStyle = "#00ff00";
   ctx.fillText(text, config.width - 10, 28);

   // Restore context state
   ctx.restore();
}