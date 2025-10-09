import * as state from "./state.js";
import { leaveRoom, sendChatMessage } from "./utils.js";
import { escapeHtml } from "./utils.js";

export function initUI() {
   setupUIListeners();
}

function setupUIListeners() {
   // Page close/refresh handler
   window.addEventListener("beforeunload", () => {
      leaveRoom();
   });

   // Menu buttons
   document.getElementById("create-room-btn").addEventListener("click", () => {
      state.socket.emit("create-room");
   });

   document.getElementById("join-room-btn").addEventListener("click", () => {
      const roomCode = document.getElementById("room-code-input").value.trim();
      if (roomCode.length === 4) {
         state.socket.emit("join-room", roomCode);
      } else {
         showError("menu-error", "Room code must be 4 characters");
      }
   });

   document.getElementById("room-code-input").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
         document.getElementById("join-room-btn").click();
      }
   });

   document.getElementById("player-name-input").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
         state.socket.emit("get-lobbies");
      }
   });

   // Player name setting (lobby)
   document.getElementById("lobby-name-input").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
         state.socket.emit("get-lobbies");
      }
   });

   // Lobby buttons
   document.getElementById("join-red-btn").addEventListener("click", () => {
      state.socket.emit("change-team", "red");
   });

   document.getElementById("join-blue-btn").addEventListener("click", () => {
      state.socket.emit("change-team", "blue");
   });

   document.getElementById("ready-btn").addEventListener("click", () => {
      state.socket.emit("ready-toggle");
   });

   document.getElementById("leave-room-btn").addEventListener("click", () => {
      leaveRoom();
   });

   document.getElementById("leave-game-btn").addEventListener("click", () => {
      leaveRoom();
   });

   // Chat functionality
   document.getElementById("send-chat-btn").addEventListener("click", () => {
      sendChatMessage();
   });

   document.getElementById("chat-input").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
         sendChatMessage();
      }
   });
}

export function showScreen(screenId) {
   document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.add("hidden");
   });
   document.getElementById(screenId).classList.remove("hidden");
}

export function showMenu() {
   showScreen("menu");
   clearErrors();
   state.socket.emit("get-lobbies");
}

export function showLobby() {
   showScreen("lobby");
   document.getElementById("room-code-display").textContent = state.currentRoom;
   clearErrors();
}

export function showGame() {
   showScreen("game");
   document.getElementById("game-room-code").textContent = state.currentRoom;
   updateChatDisplay();
}

export function showError(elementId, message) {
   document.getElementById(elementId).textContent = message;
   setTimeout(() => {
      document.getElementById(elementId).textContent = "";
   }, 5000);
}

export function clearErrors() {
   document.querySelectorAll(".error").forEach((error) => {
      error.textContent = "";
   });
}

export function updateLobbyDisplay() {
   const redPlayersDiv = document.getElementById("red-players");
   const bluePlayersDiv = document.getElementById("blue-players");

   redPlayersDiv.innerHTML = "";
   bluePlayersDiv.innerHTML = "";

   state.players.forEach((player) => {
      const playerDiv = document.createElement("div");
      playerDiv.className = `player ${player.ready ? "ready" : ""}`;
      const username = player.name || `Player ${player.id.substring(0, 6)}`;
      const playerName = player.id === state.socket.id ? `${username} (You)` : username;
      playerDiv.innerHTML = `
            <span>${playerName}</span>
            ${player.ready ? '<span class="ready-indicator">READY</span>' : ""}
        `;

      if (player.team === "red") {
         redPlayersDiv.appendChild(playerDiv);
      } else {
         bluePlayersDiv.appendChild(playerDiv);
      }
   });

   const redCount = Array.from(state.players.values()).filter((p) => p.team === "red").length;
   const blueCount = Array.from(state.players.values()).filter((p) => p.team === "blue").length;

   document.getElementById("join-red-btn").disabled = redCount >= 4;
   document.getElementById("join-blue-btn").disabled = blueCount >= 4;
}

export function updateReadyButton() {
   const readyBtn = document.getElementById("ready-btn");
   if (state.currentPlayer && state.currentPlayer.ready) {
      readyBtn.textContent = "Not Ready";
      readyBtn.classList.add("ready");
   } else {
      readyBtn.textContent = "Ready";
      readyBtn.classList.remove("ready");
   }
}

export function updateLobbiesList(lobbies) {
   const lobbiesContainer = document.getElementById("lobbies-list");
   if (lobbies.length === 0) {
      lobbiesContainer.innerHTML = `
            <div class="no-lobbies">
                <p>🔍 No lobbies available</p>
                <p style="font-size: 12px; margin-top: 5px">Create a new room or wait for others to host!</p>
            </div>`;
      return;
   }
   lobbiesContainer.innerHTML = "";
   lobbies.forEach((lobby) => {
      const lobbyDiv = document.createElement("div");
      lobbyDiv.className = "lobby-item";
      lobbyDiv.innerHTML = `
            <div class="lobby-info">
                <div class="lobby-code">${lobby.code}</div>
                <div class="lobby-players">${lobby.playerCount}/8 players (Red: ${lobby.redCount}, Blue: ${lobby.blueCount})</div>
            </div>
            <button class="lobby-join-btn">Join</button>
        `;
      lobbyDiv.addEventListener("click", () => {
         document.getElementById("room-code-input").value = lobby.code;
         state.socket.emit("join-room", lobby.code);
      });
      lobbiesContainer.appendChild(lobbyDiv);
   });
}

export function updateChatDisplay() {
   const chatMessagesDiv = document.getElementById("chat-messages");
   chatMessagesDiv.innerHTML = "";
   state.chatMessages.forEach((message) => {
      const messageDiv = document.createElement("div");
      messageDiv.className = `chat-message ${message.playerId === state.socket.id ? "own" : ""}`;
      const senderName = message.playerId === state.socket.id ? "You" : message.playerName;
      messageDiv.innerHTML = `
            <div class="chat-sender">${senderName}</div>
            <div class="chat-text">${escapeHtml(message.message)}</div>
        `;
      chatMessagesDiv.appendChild(messageDiv);
   });
   chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
}
