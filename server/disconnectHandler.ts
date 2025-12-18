import { Server } from "socket.io";
import { GameSocket } from "./types";
import { rooms, playerNames } from "./server";
import { broadcastLobbiesList } from "./misc";
import { Serializer } from "../shared/serializer";
import { EndGameResult, TeamColor } from "../shared/types";
import { endGame } from "./game";

export function setupDisconnectHandler(socket: GameSocket, io: Server): void {
   socket.on("disconnect", () => {
      console.log("User disconnected:", playerNames.get(socket.id) || "[unnamed]");

      playerNames.delete(socket.id);

      if (socket.roomCode && rooms.has(socket.roomCode)) {
         const room = rooms.get(socket.roomCode)!;
         const wasLobby = room.roomState === "waiting";

         // delete the disconnected player
         room.players.delete(socket.id);
         room.gameState.players.splice(
            room.gameState.players.findIndex((p) => p.id === socket.id)
         );

         if (room.players.size === 0) {
            rooms.delete(socket.roomCode);
            console.log(`Room ${socket.roomCode} deleted (empty)`);
            broadcastLobbiesList(io);
         } else {
            const redCount = room.getTeamCount(TeamColor.red);
            const blueCount = room.getTeamCount(TeamColor.blue);
            const teamsRemaining = (redCount > 0 ? 1 : 0) + (blueCount > 0 ? 1 : 0);

            if (teamsRemaining === 1) {
               console.log(`Game ${socket.roomCode} Finished`);
               endGame(room, { winColor: redCount > 0 ? TeamColor.red : TeamColor.blue, reason: EndGameResult.disconnect});
            } else {
               Serializer.emitToRoom(io, socket.roomCode, "room/player-list", room.players, "Map<string, Player>");
               if (wasLobby) {
                  broadcastLobbiesList(io);
               }
            }
         }
      }
   });
}
