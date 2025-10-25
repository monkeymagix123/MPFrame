import { config } from "../shared/config";
import { clamp, clampPos, clampPosV } from "../shared/math";
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
   session.ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

export function renderGame(): void {
   if (!session.ctx || !session.canvas) return;

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

	session.ctx.clearRect(0, 0, config.width, config.height)
   session.ctx.fillStyle = "#11111b";
   session.ctx.fillRect(0, 0, config.width, config.height)

   // Enable high quality effects if setting is on
   if (settings.highQuality) {
      session.ctx.shadowBlur = 0; // Reset for background
   }

   state.players.forEach((player) => {
      drawPlayer(player);
   });

   // Reset quality settings after rendering
   if (settings.highQuality) {
      session.ctx.shadowBlur = 0;
      session.ctx.globalAlpha = 1;
   }

   // Draw FPS counter if debug mode is on
   if (settings.debugMode) {
      drawFPS();
   }
}

function drawPlayer(player: Player): void {
   if (!session.ctx) return;

   const isCurrentPlayer = player.id === session.socket.id;

   // Draw dash arrow for current player
   if (isCurrentPlayer) {
      drawDashArrow(session.mousePos);
   }

   const healthRatio = player.health / player.maxHealth;

   // High quality effects
   if (settings.highQuality) {
      session.ctx.shadowBlur = isCurrentPlayer ? 20 : 15;
      session.ctx.shadowColor = player.team === "red" ? "#ea4179" : "#5075f9";
   }

   // Reset shadow for outline
   if (settings.highQuality) {
      session.ctx.shadowBlur = 0;
   }

   session.ctx.strokeStyle = player.team === "red" ? "#ff6b9d" : "#7d9bff";

   if (settings.highQuality && isCurrentPlayer) {
      session.ctx.shadowBlur = 8;
      session.ctx.shadowColor = player.team === "red" ? "#ff6b9d" : "#7d9bff";
   }

   session.ctx.lineWidth = (config.playerLength * healthRatio) / 2;
   session.ctx.strokeRect(
      player.pos.x - config.playerLength / 2 + session.ctx.lineWidth / 2,
      player.pos.y - config.playerLength / 2 + session.ctx.lineWidth / 2,
      config.playerLength - session.ctx.lineWidth,
      config.playerLength - session.ctx.lineWidth
   );

   // Draw outline for current player
   if (isCurrentPlayer) {
      session.ctx.strokeStyle = "#FFFFFF";
      session.ctx.lineWidth = 2;
      session.ctx.strokeRect(
         player.pos.x - config.playerLength / 2,
         player.pos.y - config.playerLength / 2,
         config.playerLength,
         config.playerLength
      );
   }

   if (settings.highQuality) {
      session.ctx.shadowBlur = 0;
   }

   // Draw player name
   session.ctx.font = "bold 12px Arial";
   session.ctx.textAlign = "center";
   session.ctx.fillStyle = "white";

   if (settings.highQuality) {
      // Add text shadow for better readability
      session.ctx.shadowBlur = 4;
      session.ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
   }

   const name = player.id === session.socket.id ? "You" : player.name || player.id.substring(0, 4);
   session.ctx.fillText(name, player.pos.x, player.pos.y - 25);

   if (settings.highQuality) {
      session.ctx.shadowBlur = 0;
   }
}

function drawDashArrow(toV: Vec2): void {
   if (!session.currentPlayer || !session.canvas) return;

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
   if (!session.ctx) return;

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
      session.ctx.lineWidth = config.playerLength / 3;
      session.ctx.beginPath();
      session.ctx.moveTo(fromPos.x, fromPos.y);

      // Check if fully charged
      if (k === 0) {
         // If fully charged, extend to just before the arrowhead base
         const slightBeforeEnd = v2.sub(toPos, v2.mul(vAngle, arrowBaseDistance));
         session.ctx.lineTo(slightBeforeEnd.x, slightBeforeEnd.y);
      } else {
         session.ctx.lineTo(chargedPos.x, chargedPos.y);
      }

      // high-quality effects
      if (settings.highQuality) {
         session.ctx.strokeStyle = "rgba(250, 200, 60, 0.7)";
         session.ctx.shadowBlur = 15;
         session.ctx.shadowColor = "rgba(250, 200, 60, 0.8)";
      } else {
         session.ctx.strokeStyle = "rgba(250, 200, 60, 1)";
      }
      session.ctx.stroke();
   }

   // Reset shadow for uncharged part
   if (settings.highQuality) {
      session.ctx.shadowBlur = 0;
   }


   // Draws the remaining uncharged (blue/cyan) part of the line
   // Goes from the charged part to the end
   session.ctx.lineWidth = 10;
   if (k > 0) {
      session.ctx.beginPath();
      session.ctx.moveTo(chargedPos.x, chargedPos.y);
      session.ctx.lineTo(toPos.x, toPos.y);

      if (settings.highQuality) {
         session.ctx.strokeStyle = "rgba(100, 180, 230, 0.6)";
         session.ctx.shadowBlur = 10;
         session.ctx.shadowColor = "rgba(100, 180, 230, 0.5)";
      } else {
         session.ctx.strokeStyle = "rgba(100, 180, 230, 1)";
      }
      session.ctx.stroke();
   }


   // Draw the arrowhead when fully charged
   if (k === 0) {
      if (settings.highQuality) {
         session.ctx.shadowBlur = 20;
         session.ctx.shadowColor = "rgba(250, 200, 60, 0.9)";
      }

      session.ctx.beginPath();
      session.ctx.moveTo(toPos.x, toPos.y);
      session.ctx.lineTo(toPos.x - headLength * Math.cos(angle - Math.PI / 6), toPos.y - headLength * Math.sin(angle - Math.PI / 6));
      session.ctx.lineTo(toPos.x - headLength * Math.cos(angle + Math.PI / 6), toPos.y - headLength * Math.sin(angle + Math.PI / 6));
      session.ctx.closePath();

      if (settings.highQuality) {
         session.ctx.fillStyle = "rgba(250, 200, 60, 0.7)";
      } else {
         session.ctx.fillStyle = "rgba(250, 200, 60, 1)";
      }
      session.ctx.fill();

      if (settings.highQuality) {
         session.ctx.shadowBlur = 0;
      }
   }
}

function drawFPS(): void {
   if (!session.ctx) return;

   // Save context state
   session.ctx.save();

   // Draw FPS in top right corner
   session.ctx.font = "bold 16px monospace";
   session.ctx.textAlign = "right";
   session.ctx.fillStyle = "#00ff00";

   // Add background for better readability
   const text = `FPS: ${Math.round(fps)}`;
   const textWidth = session.ctx.measureText(text).width;
   session.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
   session.ctx.fillRect(config.width - textWidth - 20, 10, textWidth + 15, 25);

   // Draw FPS text
   session.ctx.fillStyle = "#00ff00";
   session.ctx.fillText(text, config.width - 10, 28);

   // Restore context state
   session.ctx.restore();
}