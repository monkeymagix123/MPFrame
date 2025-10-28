import { session } from "./session";
import { Chat, ChatMessage } from "../shared/chat";
import * as ui from "./ui";
import { startGameLoop } from "./input";
import { updateURL } from "./url";
import { Lobby } from "../shared/types";
import { MoveData } from "../shared/moveData";
import { Player } from "../shared/player";
import { Room } from "../shared/room";
import { Deserializer } from "../shared/deserializer";

export function initSocket(): void {
   session.socket.on("menu/lobbies-list", (lobbies: Lobby[]) => {
      ui.updateLobbiesList(lobbies);
   });

   session.socket.on(
      "room/joined",
      Deserializer.createHandler<Room>("Room", (data) => {
         session.room = data;
         updatePlayersInLobby(data.players);
         ui.showLobby();
         updateURL(data.code);
         ui.updateChatDisplay();
      })
   );

   session.socket.on("room/error", (error: string) => {
      ui.showError("menu-error", error);
   });

   session.socket.on(
      "room/player-list",
      Deserializer.createHandler<Map<string, Player>>("Map<string, Player>", (players) => {
         updatePlayersInLobby(players);
      })
   );

   session.socket.on(
      "game/start",
      Deserializer.createHandler<Map<string, Player>>("Map<string, Player>", (players) => {
         updatePlayersInLobby(players);
         startGameLoop();
         ui.showGame();
      })
   );

   session.socket.on("game/player-moved", (id: string, data: MoveData) => {
      if (id === session.socket.id) return;
      const player = session.room?.gameState.players.find((p) => p.id === id);
      player?.applyMoveData(data);
   });

   session.socket.on(
      "game/chat-message",
      Deserializer.createHandler<ChatMessage>("ChatMessage", (data) => {
         session.room?.chat.addChatMessage(data);
         ui.updateChatDisplay();
      })
   );
}

export function emitPlayerMove(): void {
   if (!session.player) return;
   session.socket.emit("game/player-move", session.player.getMoveData());
}

// Method to update which players are in lobby/playerList
function updatePlayersInLobby(updatedPlayers: Map<string, Player>): void {
   if (!session.room || session.socket.id === undefined) return;
   session.room.players = updatedPlayers;

   session.player = updatedPlayers.get(session.socket.id) || null;
   ui.updateLobbyDisplay();
   ui.updateReadyButton();
}
