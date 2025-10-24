import { state } from "../shared/state";
import { session } from "./session";
import { chat, ChatMessage } from "../shared/chat";
import * as ui from "./ui";
import { startGameLoop } from "./game";
import { updateURL } from "./url";
import { RoomData, Lobby, PlayerMoveData } from "../shared/types";
import { Player } from "../shared/player";

export function initSocket(): void {
	session.socket.on("menu/lobbies-list", (lobbies: Lobby[]) => {
		ui.updateLobbiesList(lobbies);
	});
	
	session.socket.on("room/joined", (data: RoomData) => {
		session.currentRoom = data.roomCode;
		updatePlayersInLobby(data.players);
		data.chatMessages.forEach(chat.addChatMessage);
		ui.showLobby();
		updateURL(data.roomCode);
		ui.updateChatDisplay();
		ui.showLobby();
	});  

	session.socket.on("room/error", (error: string) => {
		ui.showError("menu-error", error);
	});

	session.socket.on("room/player-list", (players: Player[]) => {
		updatePlayersInLobby(players);
	});

	session.socket.on("game/start", (players: Player[]) => {
		updatePlayersInLobby(players);
		startGameLoop();
		ui.showGame();
	});

	session.socket.on("game/player-moved", (data: PlayerMoveData) => {
		state.updatePlayerPosition(data);

		// update for current player
		if (data.id === session.socket.id) {
			session.currentPlayer = state.players.find(p => p.id === session.socket.id);
		}
	});

	session.socket.on("game/chat-message", (message: ChatMessage) => {
		chat.addChatMessage(message);
		ui.updateChatDisplay();
	});
}

// Method to update which players are in lobby/playerList
function updatePlayersInLobby(updatedPlayers: Player[]): void {
	state.players = updatedPlayers.map(p => Player.fromData(p));
	
	const currentPlayer = state.players.find(p => p.id === session.socket.id);
	session.currentPlayer = currentPlayer;

	ui.updateLobbyDisplay();
	ui.updateReadyButton();
}