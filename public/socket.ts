import * as state from "./state";
import * as ui from "./ui";
import { startGameLoop } from "./game";
import { updateURL } from "./utils";
import { Player, ChatMessage, RoomData, PlayerMoveData, Lobby } from "../shared/types";

export function initSocket(): void {
  state.socket.on("room-joined", (data: RoomData) => {
    state.setCurrentRoom(data.roomCode);
    updatePlayers(data.players);
    data.chatMessages.forEach(state.addChatMessage);
    ui.showLobby();
    updateURL(data.roomCode);
    ui.updateChatDisplay();
  });

  state.socket.on("room-error", (error: string) => {
    ui.showError("menu-error", error);
  });

  state.socket.on("team-error", (error: string) => {
    ui.showError("lobby-error", error);
  });

  state.socket.on("player-joined", (players: Player[]) => {
    updatePlayers(players);
  });

  state.socket.on("player-left", (players: Player[]) => {
    updatePlayers(players);
  });

  state.socket.on("player-updated", (players: Player[]) => {
    updatePlayers(players);
  });

  state.socket.on("game-started", (players: Player[]) => {
    updatePlayers(players);
    startGameLoop();
    ui.showGame();
  });

  state.socket.on("player-moved", (data: PlayerMoveData) => {
    state.updatePlayerPosition(data);
  });

  state.socket.on("chat-message", (message: ChatMessage) => {
    state.addChatMessage(message);
    ui.updateChatDisplay();
  });

  state.socket.on("lobbies-list", (lobbies: Lobby[]) => {
    ui.updateLobbiesList(lobbies);
  });
}

function updatePlayers(updatedPlayers: Player[]): void {
  state.clearPlayers();
  updatedPlayers.forEach(state.addPlayer);
  ui.updateLobbyDisplay();
  ui.updateReadyButton();
}