import { state } from "./state";
import { session } from "./session";
import { chat, ChatMessage } from "../shared/chat";
import * as ui from "./ui";
import { startGameLoop } from "./game";
import { updateURL } from "./url";
import { RoomData, Lobby, PlayerData } from "../shared/types";
import { Player } from "../shared/player";
import { PlayerC } from "./player";

const socket = session.gameNetManager.gameSocket;

export function initSocket(): void {
	socket.on("menu/lobbies-list", (lobbies: Lobby[]) => {
		ui.updateLobbiesList(lobbies);
	});
	
	socket.on("room/joined", (data: RoomData) => {
		session.gameNetManager.currentRoom = data.roomCode;
		updatePlayersInLobby(data.players);
		data.chatMessages.forEach(chat.addChatMessage);
		ui.showLobby();
		updateURL(data.roomCode);
		ui.updateChatDisplay();
		ui.showLobby();
	});  

	socket.on("room/error", (error: string) => {
		ui.showError("menu-error", error);
	});

	socket.on("room/player-list", (players: Player[]) => {
		updatePlayersInLobby(players);
	});

	socket.on("game/start", (players: Player[]) => {
		updatePlayersInLobby(players);
		startGameLoop();
		ui.showGame();
	});

	socket.on("game/player-moved", (data: PlayerData) => {
		state.updatePlayer(data);

		// update for current player
		if (data.id === session.gameNetManager.gameSocket.id) {
			session.currentPlayer = state.getCurrentPlayer();
		}
	});

	socket.on("game/chat-message", (message: ChatMessage) => {
		chat.addChatMessage(message);
		ui.updateChatDisplay();
	});
}

// Method to update which players are in lobby/playerList
function updatePlayersInLobby(updatedPlayers: Player[]): void {
	state.players = updatedPlayers.map(p => PlayerC.copyData(p));
	
	session.currentPlayer = state.getCurrentPlayer();

	ui.updateLobbyDisplay();
	ui.updateReadyButton();
}