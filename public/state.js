import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

// --- State Variables ---
export const socket = io();
export let currentRoom = null;
export const players = new Map();
export let currentPlayer = null;
export const keys = {};
export let canvas = null;
export let ctx = null;
export let gameLoop = null;
export let chatMessages = [];

export let startDash = false;
export let dashX = 0;
export let dashY = 0;
export let dashCooldown = 0;

// --- State Modifiers ---
export function setCurrentRoom(roomCode) {
   currentRoom = roomCode;
}

export function setCanvas(canvasElement) {
   canvas = canvasElement;
   ctx = canvas.getContext("2d");
}

export function setGameLoop(loop) {
   gameLoop = loop;
}

export function addPlayer(player) {
   players.set(player.id, player);
   if (player.id === socket.id) {
      currentPlayer = player;
   }
}

export function removePlayer(playerId) {
   players.delete(playerId);
}

export function clearPlayers() {
   players.clear();
}

export function updatePlayerPosition(data) {
   const player = players.get(data.id);
   if (player) {
      player.x = data.x;
      player.y = data.y;

      // dash copy
      player.dashX = data.dashX;
      player.dashy = data.dashY;
   }
}

export function addChatMessage(message) {
   chatMessages.push(message);
}

export function resetState() {
   currentRoom = null;
   players.clear();
   currentPlayer = null;

   if (gameLoop) {
      clearInterval(gameLoop);
      gameLoop = null;
   }

   chatMessages = [];
}

export function doDash(x, y) {
   startDash = true;
   dashX = x;
   dashY = y;
}

export function resetDash() {
   startDash = false;
}

export function startCooldown() {
   dashCooldown = 1;
}

export function decrementCooldown(dt) {
   dashCooldown -= dt;
}
