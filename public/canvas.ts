import { Config } from "../shared/config";
import { clamp, clampPos } from "../shared/math";
import { Player } from "../shared/player";
import * as state from "./state";

export function renderGame(): void {
	if (!state.ctx || !state.canvas) return;

	const playerRadius = Config.playerRadius;

	// state.ctx.fillStyle = "#f0f0f0";
	state.ctx.fillStyle = "gray";
	state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);

	state.players.forEach((player) => { drawPlayer(player); });

	if (state.currentPlayer)
		drawDashArrow(state.mouseX, state.mouseY);
}

function drawPlayer(player: Player): void {
	if (!state.ctx) return;
		
	state.ctx.beginPath();
	state.ctx.arc(player.x, player.y, Config.playerRadius, 0, Math.PI * 2);
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
}


// dash cooldown thing
function drawDashArrow(x: number, y: number): void {
	const playerRadius = Config.playerRadius;

	if (!state.currentPlayer || !state.canvas) return;

	const rect = state.canvas.getBoundingClientRect();
	x -= rect.left;
	y -= rect.top;

	let dx = x - state.currentPlayer.x;
	let dy = y - state.currentPlayer.y;

	let length = Math.sqrt(dx * dx + dy * dy);

	// Using the same 100 unit distance for the arrow display
	const arrowDistance = Config.dashDistance;

	let arrowVecX = (dx / length) * arrowDistance;
	let arrowVecY = (dy / length) * arrowDistance;

	let { x: toX, y: toY } = clampPos(state.currentPlayer.x + arrowVecX, state.currentPlayer.y + arrowVecY);

	drawArrow(state.currentPlayer.x, state.currentPlayer.y, toX, toY);
}

function drawHealthBar(): void {
	// Placeholder for health bar drawing logic
}




function drawArrow(fromX: number, fromY: number, toX: number, toY: number): void {
	if (!state.ctx) return;

	const headLength = Config.headLength; // length of head in pixels

	let dx = toX - fromX;
	let dy = toY - fromY;

	const angle = Math.atan2(dy, dx);

	// draw the line
	state.ctx.lineWidth = 10;

	let length = Math.sqrt(dx * dx + dy * dy);
	let lengthMissing = length * Math.max(0, state.currentPlayer!.dashCooldown) / Config.dashCooldown;

	state.ctx.beginPath();
	state.ctx.moveTo(fromX, fromY);
	state.ctx.lineTo(toX - headLength * 0.75 * Math.cos(angle), toY - headLength * 0.75 * Math.sin(angle));
	state.ctx.strokeStyle = "rgba(250, 227, 17, 1)";
	state.ctx.stroke();

	// draw anti-line for not done part
	state.ctx.lineWidth = 6;
	state.ctx.beginPath();
	state.ctx.moveTo(toX - (headLength * 0.75 + 2) * Math.cos(angle), toY - (headLength * 0.75 + 2) * Math.sin(angle));
	const d = Math.min(length - headLength * 0.75, lengthMissing);
	state.ctx.lineTo(toX - d * Math.cos(angle), toY - d * Math.sin(angle));
	state.ctx.strokeStyle = "rgba(240, 240, 240, 1)"; // SYNC CHANIGES
	state.ctx.stroke();

	// draw the arrowhead
	if (state.currentPlayer!.dashCooldown <= 0) {
		state.ctx.beginPath();
		state.ctx.moveTo(toX, toY);
		state.ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
		state.ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
		state.ctx.lineTo(toX, toY);
		state.ctx.fillStyle = "rgba(250, 227, 17, 1)";
		state.ctx.fill();
	}
}
