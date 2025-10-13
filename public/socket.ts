import { state } from "../shared/state";
import { session } from "./session";
import { chat, ChatMessage } from "../shared/chat";
import * as ui from "./ui";
import { startGameLoop } from "./game";
import { updateURL } from "./url";
import { RoomData, Lobby, PlayerMoveData } from "../shared/types";
import { Player } from "../shared/player";

export function initSocket(): void {
	session.socket.on("room-joined", (data: RoomData) => {
		session.currentRoom = data.roomCode;
		updatePlayers(data.players);
		data.chatMessages.forEach(chat.addChatMessage);
		ui.showLobby();
		updateURL(data.roomCode);
		ui.updateChatDisplay();
		ui.showLobby();
	});  

	session.socket.on("room-error", (error: string) => {
		ui.showError("menu-error", error);
	});

	session.socket.on("team-error", (error: string) => {
		ui.showError("lobby-error", error);
	});

	session.socket.on("player-joined", (players: Player[]) => {
		updatePlayers(players);
	});

	session.socket.on("player-left", (players: Player[]) => {
		updatePlayers(players);
	});

	session.socket.on("player-updated", (players: Player[]) => {
		updatePlayers(players);
	});

	session.socket.on("game-started", (players: Player[]) => {
		updatePlayers(players);
		startGameLoop();
		ui.showGame();
	});

	session.socket.on("player-moved", (data: PlayerMoveData) => {
		state.updatePlayerPosition(data);
	});

	session.socket.on("chat-message", (message: ChatMessage) => {
		chat.addChatMessage(message);
		ui.updateChatDisplay();
	});

	session.socket.on("lobbies-list", (lobbies: Lobby[]) => {
		ui.updateLobbiesList(lobbies);
	});
}

function updatePlayers(updatedPlayers: Player[]): void {
	state.players = updatedPlayers.map(p => Player.fromData(p));
	
	const currentPlayer = state.players.find(p => p.id === session.socket.id) || null;
	session.currentPlayer = currentPlayer;

	ui.updateLobbyDisplay();
	ui.updateReadyButton();
}