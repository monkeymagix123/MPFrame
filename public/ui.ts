import * as state from "./state";
import { leaveRoom, sendChatMessage, escapeHtml } from "./utils";
import { Lobby } from "../shared/types";
import { initGame } from "./game";

export function initUI(): void {
  setupUIListeners();
}

function setupUIListeners(): void {
  // Page close/refresh handler
  window.addEventListener("beforeunload", () => {
    leaveRoom();
  });

  // Menu buttons
  const createRoomBtn = document.getElementById("create-room-btn");
  createRoomBtn?.addEventListener("click", () => {
    state.socket.emit("create-room");
  });

  const joinRoomBtn = document.getElementById("join-room-btn");
  joinRoomBtn?.addEventListener("click", () => {
    const roomCodeInput = document.getElementById("room-code-input") as HTMLInputElement;
    const roomCode = roomCodeInput?.value.trim() || "";
    if (roomCode.length === 4) {
      state.socket.emit("join-room", roomCode);
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

  // Player name setting (in-game)
  const playerNameInput = document.getElementById("player-name-input");
  playerNameInput?.addEventListener("keypress", (e: Event) => {
    const keyEvent = e as KeyboardEvent;
    if (keyEvent.key === "Enter") {
      const target = e.target as HTMLInputElement;
      const name = target.value.trim();
      if (name) {
        state.socket.emit("set-name", name);
      }
    }
  });

  playerNameInput?.addEventListener("blur", (e: Event) => {
    const target = e.target as HTMLInputElement;
    const name = target.value.trim();
    if (name) {
      state.socket.emit("set-name", name);
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
        state.socket.emit("set-name", name);
      }
    }
  });

  lobbyNameInput?.addEventListener("blur", (e: Event) => {
    const target = e.target as HTMLInputElement;
    const name = target.value.trim();
    if (name) {
      state.socket.emit("set-name", name);
    }
  });

  // Lobby buttons
  const joinRedBtn = document.getElementById("join-red-btn");
  joinRedBtn?.addEventListener("click", () => {
    state.socket.emit("change-team", "red");
  });

  const joinBlueBtn = document.getElementById("join-blue-btn");
  joinBlueBtn?.addEventListener("click", () => {
    state.socket.emit("change-team", "blue");
  });

  const readyBtn = document.getElementById("ready-btn");
  readyBtn?.addEventListener("click", () => {
    state.socket.emit("ready-toggle");
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
  const sendChatBtn = document.getElementById("send-chat-btn");
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
  state.socket.emit("get-lobbies");
}

export function showLobby(): void {
  showScreen("lobby");
  const roomCodeDisplay = document.getElementById("room-code-display");
  if (roomCodeDisplay) {
    roomCodeDisplay.textContent = state.currentRoom;
  }
  clearErrors();
}

export function showGame(): void {
  showScreen("game");
  const gameRoomCode = document.getElementById("game-room-code");
  if (gameRoomCode) {
    gameRoomCode.textContent = state.currentRoom;
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
      redPlayersDiv?.appendChild(playerDiv);
    } else {
      bluePlayersDiv?.appendChild(playerDiv);
    }
  });

  const redCount = Array.from(state.players.values()).filter((p) => p.team === "red").length;
  const blueCount = Array.from(state.players.values()).filter((p) => p.team === "blue").length;

  const joinRedBtn = document.getElementById("join-red-btn") as HTMLButtonElement;
  const joinBlueBtn = document.getElementById("join-blue-btn") as HTMLButtonElement;

  if (joinRedBtn) joinRedBtn.disabled = redCount >= 4;
  if (joinBlueBtn) joinBlueBtn.disabled = blueCount >= 4;
}

export function updateReadyButton(): void {
  const readyBtn = document.getElementById("ready-btn");
  if (!readyBtn) return;

  if (state.currentPlayer && state.currentPlayer.ready) {
    readyBtn.textContent = "Not Ready";
    readyBtn.classList.add("ready");
  } else {
    readyBtn.textContent = "Ready";
    readyBtn.classList.remove("ready");
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
          (<span style="color: #f44336;">${lobby.redCount}</span>/<span style="color: #2196f3;">${lobby.blueCount}</span>)
        </div>
      </div>
      <button class="lobby-join-btn">Join </button>
    `;

    lobbyDiv.addEventListener("click", () => {
      const roomCodeInput = document.getElementById("room-code-input") as HTMLInputElement;
      if (roomCodeInput) {
        roomCodeInput.value = lobby.code;
      }
      state.socket.emit("join-room", lobby.code);
    });
    lobbiesContainer.appendChild(lobbyDiv);
  });
}

export function updateChatDisplay(): void {
  const chatMessagesDiv = document.getElementById("chat-messages");
  if (!chatMessagesDiv) return;

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