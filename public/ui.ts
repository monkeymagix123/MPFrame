import { state } from "./state";
import { session } from "./session";
import { Lobby } from "../shared/types";
import { initGame, stopGameLoop } from "./game";
import { chat } from "../shared/chat";
import { util } from "./helpers/util";

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
	createRoomBtn?.addEventListener("click", () => session.gameNetManager.createRoom());

	const joinRoomBtn = document.getElementById("join-room-btn");
	joinRoomBtn?.addEventListener("click", () => {
		const roomCodeInput = document.getElementById("room-code-input") as HTMLInputElement;
		const roomCode = roomCodeInput?.value.trim() || "";
		if (roomCode.length === 4) {
			session.gameNetManager.joinRoom(roomCode);
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
			readName(e);
		}
	});

	playerNameInput?.addEventListener("blur", (e: Event) => readName(e));

	// Player name setting (lobby)
	const lobbyNameInput = document.getElementById("lobby-name-input");
	lobbyNameInput?.addEventListener("keypress", (e: Event) => {
		const keyEvent = e as KeyboardEvent;
		if (keyEvent.key === "Enter") {
			readName(e);
		}
	});

	lobbyNameInput?.addEventListener("blur", (e: Event) => readName);

	// Lobby buttons
	const joinRedBtn = document.getElementById("join-red-btn");
	joinRedBtn?.addEventListener("click", () => {
		session.gameNetManager.changeTeam("red");
	});

	const joinBlueBtn = document.getElementById("join-blue-btn");
	joinBlueBtn?.addEventListener("click", () => {
		session.gameNetManager.changeTeam("blue");
	});

	const readyBtn = document.getElementById("ready-btn");
	readyBtn?.addEventListener("click", () => session.gameNetManager.toggleReady());

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

function readName(e: Event): void {
	const target = e.target as HTMLInputElement;
	const name = target.value.trim();
	session.gameNetManager.setName(name);
}

export function leaveRoom(): void {
	stopGameLoop();

	window.history.replaceState({}, "", window.location.pathname);

	session.gameNetManager.gameSocket.disconnect();
	session.gameNetManager.gameSocket.connect();

	showMenu();
}

export function showScreen(screenId: string): void {
	for (const screen of document.querySelectorAll(".screen")) {
		screen.classList.add("hidden");
	}
	const targetScreen = document.getElementById(screenId);
	targetScreen?.classList.remove("hidden");
}

export function showMenu(): void {
	showScreen("menu");
	clearErrors();
	session.gameNetManager.showLobbies();
}

export function showLobby(): void {
	showScreen("lobby");
	const roomCodeDisplay = document.getElementById("room-code-display");
	if (roomCodeDisplay) {
		roomCodeDisplay.textContent = session.gameNetManager.currentRoom ?? null;
	}
	clearErrors();
}

export function showGame(): void {
	showScreen("game");
	const gameRoomCode = document.getElementById("game-room-code");
	if (gameRoomCode) {
		gameRoomCode.textContent = session.gameNetManager.currentRoom ?? null;
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
	for (const error of document.querySelectorAll(".error")) {
		error.textContent = "";
	}
}

export function updateLobbyDisplay(): void {
	const redPlayersDiv = document.getElementById("red-players");
	const bluePlayersDiv = document.getElementById("blue-players");

	if (redPlayersDiv) redPlayersDiv.innerHTML = "";
	if (bluePlayersDiv) bluePlayersDiv.innerHTML = "";

	for (const player of state.players) {
		const playerDiv = document.createElement("div");
		playerDiv.className = `player ${player.ready ? "ready" : ""}`;
		const username = player.name || `Player ${player.id.substring(0, 6)}`;
		const playerName = util.isCurPlayer(player) ? `${username} (You)` : username;
		playerDiv.innerHTML = `
			<span>${playerName}</span>
			${player.ready ? '<span class="ready-indicator">READY</span>' : ""}
		`;

		if (player.team === "red") {
			redPlayersDiv?.appendChild(playerDiv);
		} else {
			bluePlayersDiv?.appendChild(playerDiv);
		}
	}

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

	if (session.currentPlayer && session.currentPlayer.ready) {
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
		session.gameNetManager.sendChatMessage(message);
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

	for (const lobby of lobbies) {
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
			session.gameNetManager.joinRoom(lobby.code);
		});
		lobbiesContainer.appendChild(lobbyDiv);
	}
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
	for (const message of chat.chatMessages) {
		const isOwnMessage = util.isSessionID(message.playerId);

		const messageDiv = document.createElement("div");
		messageDiv.className = `chat-message ${isOwnMessage ? "own" : ""}`;

		const senderName = isOwnMessage ? "You" : message.playerName;
		messageDiv.innerHTML = `
			<div class="chat-sender">${senderName}</div>
			<div class="chat-text">${escapeHtml(message.message)}</div>
		`;

		chatMessagesDiv.appendChild(messageDiv);
	}

	chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
}