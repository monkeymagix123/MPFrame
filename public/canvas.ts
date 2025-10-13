import { Config } from "../shared/config";
import { clampPos } from "../shared/math";
import { Player } from "../shared/player";
import { state } from "../shared/state";
import { session } from "./session";
import { settings } from "./settings";

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
   
	// Enable high quality effects if setting is on
	if (settings.highQuality) {
		session.ctx.shadowBlur = 0; // Reset for background
	}

	state.players.forEach((player) => { drawPlayer(player); });
	
	// Reset quality settings after rendering
	if (settings.highQuality) {
		session.ctx.shadowBlur = 0;
		session.ctx.globalAlpha = 1;
	}
}

function drawPlayer(player: Player): void {
	if (!session.ctx) return;
	
	const isCurrentPlayer = player.id === session.socket.id;

	// Draw dash arrow for current player
	if (isCurrentPlayer) {
		drawDashArrow(session.mouseX, session.mouseY);		
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
	
	session.ctx.lineWidth = Config.playerRadius * healthRatio / 2;
	session.ctx.strokeRect(
		player.x - Config.playerRadius/2 + session.ctx.lineWidth / 2, player.y - Config.playerRadius/2 + session.ctx.lineWidth / 2,
		Config.playerRadius - session.ctx.lineWidth, Config.playerRadius - session.ctx.lineWidth
	);
	
	// Draw outline for current player
	if (isCurrentPlayer) {
		session.ctx.strokeStyle = "#FFFFFF";
		session.ctx.lineWidth = 2;
		session.ctx.strokeRect(
			player.x - Config.playerRadius/2, player.y - Config.playerRadius/2,
			Config.playerRadius, Config.playerRadius
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
	session.ctx.fillText(name, player.x, player.y - 25);
	
	if (settings.highQuality) {
		session.ctx.shadowBlur = 0;
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

function drawArrow(fromX: number, fromY: number, toX: number, toY: number): void {
  if (!session.ctx) return;
  
  const headLength = Config.headLength; // length of head in pixels
  let dx = toX - fromX;
  let dy = toY - fromY;
  const angle = Math.atan2(dy, dx);
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // Calculate how much of the arrow should be "charged" (inverse of cooldown)
  const chargedRatio = 1 - Math.max(0, Math.min(1, session.currentPlayer!.dashCooldown / Config.dashCooldown));
  const chargedLength = length * chargedRatio;
  
  const arrowBaseDistance = headLength * Math.cos(Math.PI / 6);
  
  // Draw the charged (yellow/orange) part of the line FROM the start
  if (chargedLength > 0) {
    session.ctx.lineWidth = Config.playerRadius / 3;
    session.ctx.beginPath();
    session.ctx.moveTo(fromX, fromY);
    
    // If fully charged, extend to just before the arrowhead base
    if (session.currentPlayer!.dashCooldown <= 0) {
      session.ctx.lineTo(toX - arrowBaseDistance * Math.cos(angle), toY - arrowBaseDistance * Math.sin(angle));
    } else {
      session.ctx.lineTo(fromX + chargedLength * Math.cos(angle), fromY + chargedLength * Math.sin(angle));
    }
    
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
  
  // Draw the uncharged (blue/cyan) part of the line
  session.ctx.lineWidth = 10;
  session.ctx.beginPath();
  session.ctx.moveTo(fromX + chargedLength * Math.cos(angle), fromY + chargedLength * Math.sin(angle));
  session.ctx.lineTo(toX, toY);
  
  if (settings.highQuality) {
    session.ctx.strokeStyle = "rgba(100, 180, 230, 0.6)";
    session.ctx.shadowBlur = 10;
    session.ctx.shadowColor = "rgba(100, 180, 230, 0.5)";
  } else {
    session.ctx.strokeStyle = "rgba(100, 180, 230, 1)";
  }
  session.ctx.stroke();
  
  // Draw the arrowhead when fully charged
  if (session.currentPlayer!.dashCooldown <= 0) {
    if (settings.highQuality) {
      session.ctx.shadowBlur = 20;
      session.ctx.shadowColor = "rgba(250, 200, 60, 0.9)";
    }
    
    session.ctx.beginPath();
    session.ctx.moveTo(toX, toY);
    session.ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    session.ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
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