import * as state from "./state.js";
import * as ui from "./ui.js";
import { startGameLoop } from "./game.js";
import { updateURL } from "./utils.js";

export function initSocket() {
    state.socket.on("room-joined", (data) => {
        state.setCurrentRoom(data.roomCode);
        updatePlayers(data.players);
        data.chatMessages.forEach(state.addChatMessage);
        ui.showLobby();
        updateURL(data.roomCode);
        ui.updateChatDisplay();
    });

    state.socket.on("room-error", (error) => {
        ui.showError("menu-error", error);
    });

    state.socket.on("team-error", (error) => {
        ui.showError("lobby-error", error);
    });

    state.socket.on("player-joined", (players) => {
        updatePlayers(players);
    });

    state.socket.on("player-left", (players) => {
        updatePlayers(players);
    });

    state.socket.on("player-updated", (players) => {
        updatePlayers(players);
    });

    state.socket.on("game-started", (players) => {
        updatePlayers(players);
        ui.showGame();
        startGameLoop();
    });

    state.socket.on("player-moved", (data) => {
        state.updatePlayerPosition(data);
    });

    state.socket.on("chat-message", (message) => {
        state.addChatMessage(message);
        ui.updateChatDisplay();
    });

    state.socket.on("lobbies-list", (lobbies) => {
        ui.updateLobbiesList(lobbies);
    });
}

function updatePlayers(updatedPlayers) {
    state.clearPlayers();
    updatedPlayers.forEach(state.addPlayer);
    ui.updateLobbyDisplay();
    ui.updateReadyButton();
}
