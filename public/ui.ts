import { session } from "./session";
import { Lobby } from "../shared/types";
import { initGame, stopGameLoop } from "./input";

export function initUI(): void {
   // Page close/refresh handler
   window.addEventListener("beforeunload", () => {
      leaveRoom();
   });

   // Menu buttons
   const createRoomBtn = document.getElementById("create-room-btn");
   createRoomBtn?.addEventListener("click", () => {
      session.socket.emit("menu/create-room");
   });

   const joinRoomBtn = document.getElementById("join-room-btn");
   joinRoomBtn?.addEventListener("click", () => {
      const roomCodeInput = document.getElementById("room-code-input") as HTMLInputElement;
      const roomCode = roomCodeInput?.value.trim() || "";
      if (roomCode.length === 4) {
         session.socket.emit("menu/join-room", roomCode);
      } else {
         showError("menu-error", "Room code must be 4 characters");
      }
   });

   const roomCodeInput = document.getElementById("room-code-input");
   roomCodeInput?.addEventListener("keypress", (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === "Enter") {
         joinRoomBtn?.click();
      }
   });

   // Player name setting (menu)
   const playerNameInput = document.getElementById("player-name-input");
   playerNameInput?.addEventListener("keypress", (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === "Enter") {
         const target = e.target as HTMLInputElement;
         const name = target.value.trim();
         if (name) {
            session.socket.emit("misc/set-name", name);
         }
      }
   });

   playerNameInput?.addEventListener("blur", (e: Event) => {
      const target = e.target as HTMLInputElement;
      const name = target.value.trim();
      if (name) {
         session.socket.emit("misc/set-name", name);
      }
   });

   // Player name setting (lobby)
   const lobbyNameInput = document.getElementById("lobby-name-input");
   lobbyNameInput?.addEventListener("keypress", (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === "Enter") {
         const target = e.target as HTMLInputElement;
         const name = target.value.trim();
         if (name) {
            session.socket.emit("misc/set-name", name);
         }
      }
   });

   lobbyNameInput?.addEventListener("blur", (e: Event) => {
      const target = e.target as HTMLInputElement;
      const name = target.value.trim();
      if (name) {
         session.socket.emit("misc/set-name", name);
      }
   });

   // Lobby buttons
   const joinRedBtn = document.getElementById("join-red-btn");
   joinRedBtn?.addEventListener("click", () => {
      session.socket.emit("lobby/change-team", "red");
   });

   const joinBlueBtn = document.getElementById("join-blue-btn");
   joinBlueBtn?.addEventListener("click", () => {
      session.socket.emit("lobby/change-team", "blue");
   });

   const readyBtn = document.getElementById("ready-btn");
   readyBtn?.addEventListener("click", () => {
      session.socket.emit("lobby/ready-toggle");
   });

   const leaveRoomBtn = document.getElementById("leave-room-btn");
   leaveRoomBtn?.addEventListener("click", () => {
      leaveRoom();
   });

   const leaveGameBtn = document.getElementById("leave-game-btn");
   leaveGameBtn?.addEventListener("click", () => {
      leaveRoom();
   });

   // Chat functionality
   const sendChatBtn = document.getElementById("misc/send-chat-btn");
   sendChatBtn?.addEventListener("click", () => {
      sendChatMessage();
   });

   const chatInput = document.getElementById("chat-input");
   chatInput?.addEventListener("keypress", (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === "Enter") {
         sendChatMessage();
      }
   });
}

export function leaveRoom(): void {
   stopGameLoop();

   window.history.replaceState({}, "", window.location.pathname);

   session.socket.disconnect();
   session.socket.connect();

   showMenu();
}

export function showScreen(screenId: string): void {
   document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.add("hidden");
   });
   const targetScreen = document.getElementById(screenId);
   targetScreen?.classList.remove("hidden");
}

export function showMenu(): void {
   showScreen("menu");
   clearErrors();
   session.socket.emit("menu/list-lobbies");
}

export function showLobby(): void {
   showScreen("lobby");
   const roomCodeDisplay = document.getElementById("room-code-display");
   if (roomCodeDisplay) {
      roomCodeDisplay.textContent = session.room?.code || "";
   }
   clearErrors();
}

export function showGame(): void {
   showScreen("game");
   const gameRoomCode = document.getElementById("game-room-code");
   if (gameRoomCode) {
      gameRoomCode.textContent = session.room?.code || "";
   }
   updateChatDisplay();
   initGame();
}

export function showError(elementId: string, message: string): void {
   const errorElement = document.getElementById(elementId);
   if (errorElement) {
      errorElement.textContent = message;
      setTimeout(() => {
         errorElement.textContent = "";
      }, 5000);
   }
}

export function clearErrors(): void {
   document.querySelectorAll(".error").forEach((error) => {
      error.textContent = "";
   });
}

export function updateLobbyDisplay(): void {
   const redPlayersDiv = document.getElementById("red-players");
   const bluePlayersDiv = document.getElementById("blue-players");

   if (redPlayersDiv) redPlayersDiv.innerHTML = "";
   if (bluePlayersDiv) bluePlayersDiv.innerHTML = "";

   session.room?.players.forEach((player) => {
      const playerDiv = document.createElement("div");
      playerDiv.className = `player ${player.ready ? "ready" : ""}`;
      const username = player.name || `Player ${player.id.substring(0, 6)}`;
      const playerName = player.id === session.socket.id ? `${username} (You)` : username;
      playerDiv.innerHTML = `
      <span>${playerName}</span>
      ${player.ready ? '<span class="ready-indicator">READY</span>' : ""}
    `;

      if (player.team === "red") {
         redPlayersDiv?.appendChild(playerDiv);
      } else {
         bluePlayersDiv?.appendChild(playerDiv);
      }
   });

   const players = session.room?.gameState.players.values();
   const redCount = players ? Array.from(players).filter((p) => p.team === "red").length : 0;
   const blueCount = players ? Array.from(players).filter((p) => p.team === "blue").length : 0;

   const joinRedBtn = document.getElementById("join-red-btn") as HTMLButtonElement;
   const joinBlueBtn = document.getElementById("join-blue-btn") as HTMLButtonElement;

   if (joinRedBtn) joinRedBtn.disabled = redCount >= 4;
   if (joinBlueBtn) joinBlueBtn.disabled = blueCount >= 4;
}

export function updateReadyButton(): void {
   const readyBtn = document.getElementById("ready-btn");
   if (!readyBtn) return;

   if (session.player && session.player.ready) {
      readyBtn.textContent = "Not Ready";
      readyBtn.classList.add("ready");
   } else {
      readyBtn.textContent = "Ready";
      readyBtn.classList.remove("ready");
   }
}

export function sendChatMessage(): void {
   const chatInput = document.getElementById("chat-input") as HTMLInputElement;
   if (!chatInput) return;

   const message = chatInput.value.trim();
   if (message.length > 0) {
      session.socket.emit("misc/send-chat", message);
      chatInput.value = "";
   }
}

export function updateLobbiesList(lobbies: Lobby[]): void {
   const lobbiesContainer = document.getElementById("lobbies-list");
   if (!lobbiesContainer) return;

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
        <div class="lobby-players">
          (<span style="color: #ea4179;">${lobby.redCount}</span>/<span style="color: #2196f3;">${lobby.blueCount}</span>)
        </div>
      </div>
      <button class="lobby-join-btn">Join </button>
    `;

      lobbyDiv.addEventListener("click", () => {
         const roomCodeInput = document.getElementById("room-code-input") as HTMLInputElement;
         if (roomCodeInput) {
            roomCodeInput.value = lobby.code;
         }
         session.socket.emit("menu/join-room", lobby.code);
      });
      lobbiesContainer.appendChild(lobbyDiv);
   });
}

function escapeHtml(text: string): string {
   const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
   };
   return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function updateChatDisplay(): void {
   const chatMessagesDiv = document.getElementById("chat-messages");
   if (!chatMessagesDiv) return;

   chatMessagesDiv.innerHTML = "";
   session.room?.chat.messages.forEach((message) => {
      const messageDiv = document.createElement("div");
      messageDiv.className = `chat-message ${message.id === session.socket.id ? "own" : ""}`;
      const senderName = message.id === session.socket.id ? "You" : message.name;
      messageDiv.innerHTML = `
      <div class="chat-sender">${senderName}</div>
      <div class="chat-text">${escapeHtml(message.message)}</div>
    `;
      chatMessagesDiv.appendChild(messageDiv);
   });
   chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
}
