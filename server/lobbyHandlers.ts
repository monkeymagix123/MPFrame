import { Server } from "socket.io";
import { GameSocket } from "./types";
import { Room } from "../shared/room";
import { rooms } from "./server";
import { broadcastLobbiesList } from "./misc";
import { config } from "../shared/config";
import { Serializer } from "../shared/serializer";

function startGame(room: Room, io: Server): void {
   const wasWaiting = room.roomState === "waiting";

   room.players.forEach((player) => {
      player.ready = false;
      player.pos.x = Math.random() * 760 + 20;
      player.pos.y = Math.random() * 560 + 20;
      player.health = config.maxHealth;
      player.dashProgress = config.dashCooldown;
      player.dashing = false;
   });

   room.startGame();

   Serializer.emitToRoom(io, room.code, "game/start", room.players, "Map<string, Player>");

   if (wasWaiting) {
      broadcastLobbiesList(io);
   }
}

export function setupLobbyHandlers(socket: GameSocket, io: Server): void {
   socket.on("lobby/change-team", (team: "red" | "blue") => {
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

      const redCount = room.getTeamCount("red");
      const blueCount = room.getTeamCount("blue");

      if (room.allPlayersReady() && room.players.size >= 2 && redCount > 0 && blueCount > 0) {
         startGame(room, io);
      }
   });
}
