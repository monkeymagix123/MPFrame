import { Config } from "../shared/config";
import { clamp, clampPos } from "../shared/math";
import { Player } from "../shared/player";
import { state } from "../shared/state";
import { session } from "./session";

export function resizeCanvas(): void {
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
  const gameArea = document.getElementById("game-area");

  if (!canvas || !gameArea) return;

  // Get the display size (CSS size) of the game area
  const rect = gameArea.getBoundingClientRect();
  const displayWidth = rect.width;
  const displayHeight = rect.height;

  const scale = Config.scale;

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

  session.canvas = canvas;
  session.ctx = ctx;
}

export function renderGame(): void {
	if (!session.ctx || !session.canvas) return;

	const playerRadius = Config.playerRadius;

	session.ctx.fillStyle = '#11111b';
	session.ctx.fillRect(0, 0, session.canvas.width, session.canvas.height);
   
	if (session.currentPlayer)
		drawDashArrow(session.mouseX, session.mouseY);

	state.players.forEach((player) => { drawPlayer(player); });
}

function drawPlayer(player: Player): void {
	if (!session.ctx) return;
		
	session.ctx.beginPath();
	session.ctx.arc(player.x, player.y, Config.playerRadius, 0, Math.PI * 2);
	session.ctx.fillStyle = player.team === "red" ? "#ea4179" : "#5075f9";
	session.ctx.fill();

	session.ctx.font = "bold 12px Arial";
	session.ctx.textAlign = "center";
	const name = player.id === session.socket.id ? "You" : player.name || player.id.substring(0, 4);
	session.ctx.fillText(name, player.x, player.y - 25);
	
	if (player.id === session.socket.id) {
		session.ctx.strokeStyle = "#FFFFFF";
		session.ctx.lineWidth = 3;
		session.ctx.stroke();
	}
}

function drawDashArrow(x: number, y: number): void {
	const playerRadius = Config.playerRadius;

	if (!session.currentPlayer || !session.canvas) return;

	const rect = session.canvas.getBoundingClientRect();
	x -= rect.left;
	y -= rect.top;

	let dx = x - session.currentPlayer.x;
	let dy = y - session.currentPlayer.y;

	let length = Math.sqrt(dx * dx + dy * dy);

	// Using the same 100 unit distance for the arrow display
	const arrowDistance = Config.dashDistance;

	let arrowVecX = (dx / length) * arrowDistance;
	let arrowVecY = (dy / length) * arrowDistance;

	let { x: toX, y: toY } = clampPos(session.currentPlayer.x + arrowVecX, session.currentPlayer.y + arrowVecY);

	drawArrow(session.currentPlayer.x, session.currentPlayer.y, toX, toY);
}

function drawHealthBar(): void {
	// Placeholder for health bar drawing logic
}

function drawArrow(fromX: number, fromY: number, toX: number, toY: number): void {
	if (!session.ctx) return;

	const headLength = Config.headLength; // length of head in pixels

	let dx = toX - fromX;
	let dy = toY - fromY;

	const angle = Math.atan2(dy, dx);

	// draw the line
	session.ctx.lineWidth = 10;

	let length = Math.sqrt(dx * dx + dy * dy);
	let lengthMissing = length * Math.max(0, session.currentPlayer!.dashCooldown) / Config.dashCooldown;

	session.ctx.beginPath();
	session.ctx.moveTo(fromX, fromY);
	session.ctx.lineTo(toX - headLength * 0.75 * Math.cos(angle), toY - headLength * 0.75 * Math.sin(angle));
	session.ctx.strokeStyle = "rgba(250, 227, 17, 1)";
	session.ctx.stroke();

	// draw anti-line for not done part
	session.ctx.lineWidth = 6;
	session.ctx.beginPath();
	session.ctx.moveTo(toX - (headLength * 0.75 + 2) * Math.cos(angle), toY - (headLength * 0.75 + 2) * Math.sin(angle));
	const d = Math.min(length - headLength * 0.75, lengthMissing);
	session.ctx.lineTo(toX - d * Math.cos(angle), toY - d * Math.sin(angle));
	session.ctx.strokeStyle = "rgba(240, 240, 240, 1)"; // SYNC CHANIGES
	session.ctx.stroke();

	// draw the arrowhead
	if (session.currentPlayer!.dashCooldown <= 0) {
		session.ctx.beginPath();
		session.ctx.moveTo(toX, toY);
		session.ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
		session.ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
		session.ctx.lineTo(toX, toY);
		session.ctx.fillStyle = "rgba(250, 227, 17, 1)";
		session.ctx.fill();
	}
}
