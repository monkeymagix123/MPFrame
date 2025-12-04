import { Server } from "socket.io";
import { GameSocket } from "./types";
import { MoveData } from "../shared/moveData";
import { rooms } from "./server";
import { Serializer, validateMoveData } from "../shared/serializer";

export function setupGameHandlers(socket: GameSocket, io: Server): void {
   socket.on("game/player-move", (data: MoveData) => {
      if (!validateMoveData(data)) {
         console.warn("Invalid move data received");
         return;
      }

      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode)!;
      const player = room.gameState.players.find((p) => p.id === socket.id); // figure out why players map doesn't link

      if (!player || room.roomState !== "playing") return;

      player.applyMoveData(data);

      socket.to(socket.roomCode).emit("game/player-moved", socket.id, data);
   });

   socket.on("game/player-buy-upgrade", (upgrade: string) => {
      if (!socket.roomCode || !rooms.has(socket.roomCode)) return;

      const room = rooms.get(socket.roomCode)!;
      const player = room.gameState.players.find((p) => p.id === socket.id); // figure out why players map doesn't link

      if (!player || room.roomState !== "skill-selection") return;

      const boughtUpgrade = player.buyUpgrade(upgrade);

      if (boughtUpgrade) {
         Serializer.emitToRoom(io, socket.roomCode, "game/player-bought-upgrade", { id: socket.id, upgrade: upgrade })
      }
   })
}
