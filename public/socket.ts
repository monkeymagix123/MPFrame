import { session } from "./session";
import { ChatMessage } from "../shared/chat";
import * as ui from "./ui";
import { startGameLoop } from "./gameLoop";
import { updateURL } from "./url";
import { EndGameMsg, Lobby } from "../shared/types";
import { DamageData, MoveData } from "../shared/moveData";
import { Player } from "../shared/player";
import { Room } from "../shared/room";
import { Serializer } from "../shared/serializer";
import { Deserializer } from "../shared/deserializer";
import * as tree from "./tree";

export function initSocket(): void {
   session.socket.on("menu/lobbies-list", (lobbies: Lobby[]) => {
      ui.updateLobbiesList(lobbies);
   });

   session.socket.on(
      "room/joined",
      Deserializer.createHandler<Room>("Room", (data) => {
         session.room = data;
         updatePlayerList(data.players);
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
         updatePlayerList(players);
      })
   );

   session.socket.on(
      "game/start",
      Deserializer.createHandler<Map<string, Player>>("Map<string, Player>", (players) => {
         updatePlayerList(players);
         startGameLoop();
         ui.showGame();
      })
   );

   session.socket.on(
      "game/start-match",
      Deserializer.createHandler<Map<string, Player>>("Map<string, Player>", (players) => {
         updatePlayerList(players);
         startGameLoop();
         ui.showGame();
         tree.hideUI();
      })
   );

   session.socket.on("game/player-moved", (id: string, data: MoveData) => {
      if (id === session.socket.id) return;
      const player = session.room?.gameState.players.find((p) => p.id === id);
      player?.applyMoveData(data);
   });

   session.socket.on("game/player-damage", (damage: DamageData) => {
      const player = session.room?.gameState.players.find((p) => p.id === damage.playerId);

      if (!player) return;

      player.takeDamage(damage.damage);
   });

   session.socket.on(
      "game/chat-message",
      Deserializer.createHandler<ChatMessage>("ChatMessage", (data) => {
         session.room?.chat.addChatMessage(data);
         ui.updateChatDisplay();
      })
   );

   session.socket.on(
      "game/game-objects",
      (data) => {
         session.room!.gameState.gameObjects = data;
      }
   )

   // receive player buy upgrade
   session.socket.on(
      "game/player-bought-upgrade",
      (data: { id: string; upgrade: string }) => {
         const id = data.id;
         const upgrade = data.upgrade;

         const player = session.room?.gameState.players.find((p) => p.id === id);

         if (!player) return;

         player.buyUpgrade(upgrade); // updating already handled by tree update loop
      }
   )

   // receive match player data
   session.socket.on(
      "game/player-all-data",
      Deserializer.createHandler<Map<string, Player>>("Player[]", (players) => {
         updatePlayerList(players);
      })
   )

   session.socket.on(
      "game/end-match",
      (data: EndGameMsg) => {
         // draw end game ui
         console.log("Match ended", data);
         session.endGame(data);
      }
   )

   session.socket.on(
      "game/end",
      (data: EndGameMsg) => {
         // draw end game ui
         console.log("Game ended", data);
         session.endGame(data);
      }
   )
}

export function emitPlayerMove(): void {
   if (!session.player) return;

   const moveData = session.player.getMoveData();
   
   Serializer.emit(session.socket, "game/player-move", moveData, "MoveData");
}

// Method to update which players are in lobby/playerList
function updatePlayerList(updatedPlayers: Map<string, Player>): void {
   if (!session.room || session.socket.id === undefined) return;
   session.room.players = updatedPlayers;

   session.player = updatedPlayers.get(session.socket.id) || null;
   session.room.gameState.players = Array.from(updatedPlayers.values());

   ui.updateLobbyDisplay();
   ui.updateReadyButton();
}
