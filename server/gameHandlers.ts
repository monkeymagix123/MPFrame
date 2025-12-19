import { Server } from "socket.io";
import { GameSocket } from "./types";
import { PlayerDelta } from "@shared/player";
import { rooms } from "./server";
import { Serializer } from "@shared/serializer";
import { startMatch } from "./game";

export function setupGameHandlers(socket: GameSocket, io: Server): void {
   socket.on("game/player-move", (data: PlayerDelta) => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode)!;
      const player = room.gameState.players.find((p) => p.id === socket.id); // figure out why players map doesn't link

      if (!player || room.roomState !== "playing") return;

      player.applyPlayerDelta(data);

      socket.to(socket.roomCode).emit("game/player-delta", {
         id: socket.id,
         ...data,
      });
   });

   socket.on("game/player-buy-upgrade", (upgrade: string) => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode)!;
      const player = room.gameState.players.find((p) => p.id === socket.id);

      if (!player || room.roomState !== "skill-selection") return;

      const boughtUpgrade = player.buyUpgrade(upgrade);

      if (boughtUpgrade) {
         Serializer.emitToRoom(io, socket.roomCode, "game/player-bought-upgrade", { id: socket.id, upgrade: upgrade })
      }
   })

   socket.on("game/player-skill-ready", () => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode)!;
      const player = room.gameState.players.find((p) => p.id === socket.id);


      // console.log("recieved")
      if (!player || room.roomState !== "skill-selection") return;
      // console.log("toggled")

      player.skillReady = !player.skillReady;

      // try to start match by checking if all players ready
      if (room.gameState.players.every((p) => p.skillReady)) {
         console.log("all players ready")
         startMatch(room, io);
      }
   })
}
