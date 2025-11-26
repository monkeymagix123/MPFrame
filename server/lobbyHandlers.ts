import { Server } from "socket.io";
import { GameSocket } from "./types";
import { rooms } from "./server";
import { Serializer } from "../shared/serializer";
import { TeamColor } from "../shared/types";

import { startGame } from "./game";

export function setupLobbyHandlers(socket: GameSocket, io: Server): void {
   socket.on("lobby/change-team", (team: TeamColor) => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode)!;
      const player = room.getPlayer(socket.id);

      if (!player || room.roomState !== "waiting") return;

      player.team = team;
      player.ready = false;

      Serializer.emitToRoom(io, socket.roomCode, "room/player-list", room.players, "Map<string, Player>");
   });

   socket.on("lobby/ready-toggle", () => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode)!;
      const player = room.getPlayer(socket.id);

      if (!player || room.roomState !== "waiting") return;

      player.ready = !player.ready;

      Serializer.emitToRoom(io, socket.roomCode, "room/player-list", room.players, "Map<string, Player>");

      const redCount = room.getTeamCount(TeamColor.red);
      const blueCount = room.getTeamCount(TeamColor.blue);

      if (room.allPlayersReady() && room.players.size >= 2 && redCount > 0 && blueCount > 0) {
         startGame(room, io);
      }
   });
}
