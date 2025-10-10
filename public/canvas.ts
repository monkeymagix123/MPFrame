import { Config } from "../shared/config";
import { clamp } from "../shared/math";
import { Player } from "../shared/types";
import * as state from "./state";

export function renderGame(): void {
	if (!state.ctx || !state.canvas) return;

	const playerRadius = Config.playerRadius;

	state.ctx.fillStyle = "#f0f0f0";
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

	let { x: toX, y: toY } = clampDash(state.currentPlayer.x + arrowVecX, state.currentPlayer.y + arrowVecY);

	console.log(Object.keys(state.currentPlayer));
	console.log("Drawing arrow to:", toX, toY);

	drawArrow(state.currentPlayer.x, state.currentPlayer.y, toX, toY);
}


function clampDash(x: number, y: number): { x: number; y: number } {
	if (!state.canvas) return { x, y };

	const playerRadius = Config.playerRadius;
	const clampedX = clamp(x, playerRadius, state.canvas.width - playerRadius);
	const clampedY = clamp(y, playerRadius, state.canvas.height - playerRadius);

	return { x: clampedX, y: clampedY };
}


function drawArrow(fromX: number, fromY: number, toX: number, toY: number): void {
	if (!state.ctx) return;

	console.log(fromX, fromY, toX, toY); // THIS THING

	const headLength = Config.headLength; // length of head in pixels

	let dx = toX - fromX;
	let dy = toY - fromY;

	const angle = Math.atan2(dy, dx);

	// draw the line
	state.ctx.lineWidth = 10;

	let length = Math.sqrt(dx * dx + dy * dy);
	let lengthMissing = length * Math.max(0, state.dashCooldown) / Config.dashCooldown;

	state.ctx.beginPath();
	state.ctx.moveTo(fromX, fromY);
	state.ctx.lineTo(toX - length * 0.1 * Math.cos(angle), toY - length * 0.1 * Math.sin(angle));
	state.ctx.strokeStyle = "rgba(250, 227, 17, 1)";
	state.ctx.stroke();

	// draw anti-line for not done part
	state.ctx.lineWidth = 6;
	state.ctx.beginPath();
	state.ctx.moveTo(toX - length * 0.12 * Math.cos(angle), toY - length * 0.12 * Math.sin(angle));
	state.ctx.lineTo(toX - lengthMissing * Math.cos(angle), toY - lengthMissing * Math.sin(angle));
	state.ctx.strokeStyle = "rgba(240, 240, 240, 1)";
	state.ctx.stroke();

	// draw the arrowhead
	if (state.dashCooldown < 0.1) {
		state.ctx.beginPath();
		state.ctx.moveTo(toX, toY);
		state.ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
		state.ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
		state.ctx.lineTo(toX, toY);
		state.ctx.fillStyle = "rgba(250, 227, 17, 1)";
		state.ctx.fill();
	}

	console.log("hi");
}
