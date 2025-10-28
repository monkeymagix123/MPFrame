import { config } from "../shared/config";
import { clampPosV } from "../shared/math";
import { Player } from "../shared/player";
import { v2, Vec2 } from "../shared/v2";
import { session } from "./session";
import { settings } from "./settings";
import { state } from "./state";

// FPS tracking
let lastFrameTime = performance.now();
let fps = 0;
const fpsHistory: number[] = [];
const fpsHistorySize = 30;

// Offscreen canvas for double buffering
let offscreenCanvas: HTMLCanvasElement | null = null;
let offscreenCtx: CanvasRenderingContext2D | null = null;

// Cache for pre-rendered elements
let arrowCache: { [key: string]: HTMLCanvasElement } = {};

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

   // Create or resize offscreen canvas
   if (!offscreenCanvas) {
      offscreenCanvas = document.createElement("canvas");
      offscreenCtx = offscreenCanvas.getContext("2d", {
         alpha: false,
         desynchronized: true,
      });
   }
   offscreenCanvas.width = config.width;
   offscreenCanvas.height = config.height;
}

export function renderGame(): void {
   if (!session.canvasManager.hasDrawUI() || !session.currentRoom || !offscreenCanvas || !offscreenCtx) return;

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

   const ctx = offscreenCtx; // Render to offscreen canvas first

   // Clear and fill background
   ctx.fillStyle = "#11111b";
   ctx.fillRect(0, 0, config.width, config.height);

   // Set image smoothing once
   ctx.imageSmoothingEnabled = settings.highQuality;

   for (const player of state.players) {
      drawPlayer(player, ctx);
   }

   // Reset quality settings after rendering
   if (settings.highQuality) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
   }

   // Draw FPS counter if debug mode is on
   if (settings.debugMode) {
      drawFPS(ctx);
   }

   // Copy offscreen canvas to main canvas in one operation
   session.canvasManager.ctx.drawImage(offscreenCanvas, 0, 0);
}

function drawPlayer(player: Player, ctx: CanvasRenderingContext2D): void {
   const isCurrentPlayer = player.id === session.socket.id;

   // Draw dash arrow for current player
   if (isCurrentPlayer) {
      drawDashArrow(session.mousePos, ctx);
   }

   const healthRatio = player.health / player.maxHealth;
   const isRed = player.team === "red";

   // Batch shadow settings
   if (settings.highQuality) {
      ctx.shadowBlur = isCurrentPlayer ? 20 : 15;
      ctx.shadowColor = isRed ? "#ea4179" : "#5075f9";
   }

   // Draw main player square
   ctx.strokeStyle = isRed ? "#ff6b9d" : "#7d9bff";

   if (settings.highQuality && isCurrentPlayer) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = isRed ? "#ff6b9d" : "#7d9bff";
   }

   const halfPlayer = config.playerLength / 2;
   const lineWidth = (config.playerLength * healthRatio) / 2;
   ctx.lineWidth = lineWidth;

   ctx.strokeRect(
      player.pos.x - halfPlayer + lineWidth / 2,
      player.pos.y - halfPlayer + lineWidth / 2,
      config.playerLength - lineWidth,
      config.playerLength - lineWidth
   );

   // Draw outline for current player
   if (isCurrentPlayer) {
      if (settings.highQuality) ctx.shadowBlur = 0;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.strokeRect(player.pos.x - halfPlayer, player.pos.y - halfPlayer, config.playerLength, config.playerLength);
   }

   // Batch text settings
   if (settings.highQuality) {
      ctx.shadowBlur = 4;
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
   } else {
      ctx.shadowBlur = 0;
   }

   ctx.font = "bold 12px Arial";
   ctx.textAlign = "center";
   ctx.fillStyle = "white";

   const name = isCurrentPlayer ? "You" : player.name || player.id.substring(0, 4);
   ctx.fillText(name, player.pos.x, player.pos.y - 25);

   if (settings.highQuality) {
      ctx.shadowBlur = 0;
   }
}

function drawDashArrow(mousePos: Vec2, ctx: CanvasRenderingContext2D): void {
   if (!session.currentPlayer) return;

   const direction = v2.sub(mousePos, session.currentPlayer.pos);
   const length = v2.length(direction);

   // Using the same 100 unit distance for the arrow display
   const arrowDistance = config.dashDistance;

   const arrowVec = v2.mul(v2.div(direction, length), arrowDistance);
   const targetPos = clampPosV(v2.add(session.currentPlayer.pos, arrowVec));

   drawArrow(session.currentPlayer.pos, targetPos, ctx);
}

function drawArrow(from: Vec2, to: Vec2, ctx: CanvasRenderingContext2D): void {
   const headLength = config.headLength;
   const direction = v2.sub(to, from);
   const angle = Math.atan2(direction.y, direction.x);
   const length = v2.length(direction);

   // Calculate charge ratio once
   const chargedRatio = 1 - Math.max(0, Math.min(1, session.currentPlayer!.dashCooldown / config.dashCooldown));
   const chargedLength = length * chargedRatio;
   const arrowBaseDistance = headLength * Math.cos(Math.PI / 6);
   const isFullyCharged = session.currentPlayer!.dashCooldown <= 0;

   // Pre-calculate common values
   const cosAngle = Math.cos(angle);
   const sinAngle = Math.sin(angle);

   // Draw charged part
   if (chargedLength > 0) {
      ctx.lineWidth = config.playerLength / 3;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);

      if (isFullyCharged) {
         const endX = to.x - arrowBaseDistance * cosAngle;
         const endY = to.y - arrowBaseDistance * sinAngle;
         ctx.lineTo(endX, endY);
      } else {
         const chargedEndX = from.x + chargedLength * cosAngle;
         const chargedEndY = from.y + chargedLength * sinAngle;
         ctx.lineTo(chargedEndX, chargedEndY);
      }

      if (settings.highQuality) {
         ctx.strokeStyle = "rgba(250, 200, 60, 0.7)";
         ctx.shadowBlur = 15;
         ctx.shadowColor = "rgba(250, 200, 60, 0.8)";
      } else {
         ctx.strokeStyle = "rgba(250, 200, 60, 1)";
      }
      ctx.stroke();
   }

   // Draw uncharged part
   if (settings.highQuality) ctx.shadowBlur = 0;

   ctx.lineWidth = 10;
   ctx.beginPath();
   const chargedEndX = from.x + chargedLength * cosAngle;
   const chargedEndY = from.y + chargedLength * sinAngle;
   ctx.moveTo(chargedEndX, chargedEndY);
   ctx.lineTo(to.x, to.y);

   if (settings.highQuality) {
      ctx.strokeStyle = "rgba(100, 180, 230, 0.6)";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(100, 180, 230, 0.5)";
   } else {
      ctx.strokeStyle = "rgba(100, 180, 230, 1)";
   }
   ctx.stroke();

   // Draw arrowhead when fully charged
   if (isFullyCharged) {
      if (settings.highQuality) {
         ctx.shadowBlur = 20;
         ctx.shadowColor = "rgba(250, 200, 60, 0.9)";
      }

      ctx.beginPath();
      ctx.moveTo(to.x, to.y);

      const leftAngle = angle - Math.PI / 6;
      ctx.lineTo(to.x - headLength * Math.cos(leftAngle), to.y - headLength * Math.sin(leftAngle));

      const rightAngle = angle + Math.PI / 6;
      ctx.lineTo(to.x - headLength * Math.cos(rightAngle), to.y - headLength * Math.sin(rightAngle));

      ctx.closePath();
      ctx.fillStyle = settings.highQuality ? "rgba(250, 200, 60, 0.7)" : "rgba(250, 200, 60, 1)";
      ctx.fill();

      if (settings.highQuality) ctx.shadowBlur = 0;
   }
}

function drawFPS(ctx: CanvasRenderingContext2D): void {
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