import { io, Socket } from "socket.io-client";
import { ChatMessage, PlayerMoveData, Keys } from "../shared/types";
import { Player } from "../shared/player";

import { Config } from "../shared/config";

// --- State Variables ---
export const socket: Socket = io();
export let currentRoom: string | null = null;
export const players: Map<string, Player> = new Map();
export let currentPlayer: Player | null = null;
export const keys: Keys = {};
export let canvas: HTMLCanvasElement | null = null;
export let ctx: CanvasRenderingContext2D | null = null;
export let gameLoop: number | null = null;
export let chatMessages: ChatMessage[] = [];

export let startDash = false;
export let dashX = 0;
export let dashY = 0;
export let dashCooldown = 0;

export let mouseX = 0;
export let mouseY = 0;

// --- State Modifiers ---
export function setCurrentRoom(roomCode: string): void {
	currentRoom = roomCode;
}

export function setCanvas(canvasElement: HTMLCanvasElement): void {
	canvas = canvasElement;
	ctx = canvas.getContext("2d");
}

export function setGameLoop(loop: number | null): void {
	gameLoop = loop;
}

export function addPlayer(player: Player): void {
	players.set(player.id, player);
	if (player.id === socket.id) {
		currentPlayer = player;
	}
}

export function removePlayer(playerId: string): void {
	players.delete(playerId);
}

export function clearPlayers(): void {
	players.clear();
}

export function updatePlayerPosition(data: PlayerMoveData): void {
	const player = players.get(data.id);
	if (player) {
		player.x = data.x;
		player.y = data.y;

		// dash copy
		player.dashX = data.dashX;
		player.dashY = data.dashY;
	}
}

export function addChatMessage(message: ChatMessage): void {
	chatMessages.push(message);
}

export function resetState(): void {
	currentRoom = null;
	players.clear();
	currentPlayer = null;

	if (gameLoop !== null) {
		cancelAnimationFrame(gameLoop);
		gameLoop = null;
	}

	chatMessages = [];
}

export function doDash(x: number, y: number): void {
	startDash = true;
	dashX = x;
	dashY = y;
}

export function resetDash(): void {
	startDash = false;
}

export function startCooldown(): void {
	dashCooldown = Config.dashCooldown;
}

export function decrementCooldown(dt: number): void {
	dashCooldown -= dt;
}

export function setMousePosition(x: number, y: number): void {
	mouseX = x;
	mouseY = y;
}